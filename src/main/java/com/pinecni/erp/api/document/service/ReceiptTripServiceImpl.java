package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptTripCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripUpdateDTO;
import com.pinecni.erp.api.document.mapper.ReceiptTripMapper;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripAttendeeRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ReceiptTrip;
import com.pinecni.erp.entity.ReceiptTripAttendee;
import com.pinecni.erp.entity.ApprovalDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 연구비증빙 출장 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptTripServiceImpl implements ReceiptTripService {

    private final ReceiptTripRepository receiptTripRepository;
    private final ReceiptTripAttendeeRepository attendeeRepository;
    private final ProjectRepository projectRepository;
    private final ReceiptTripMapper mapper;
    private final ApprovalDocumentRepository approvalDocumentRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getAllReceiptTrips() {
        log.debug("전체 출장 목록 조회");
        return receiptTripRepository.findAllByOrderByTripDateDesc()
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptTripDTO getReceiptTripById(Long idx) {
        log.debug("출장 상세 조회 - idx: {}", idx);

        ReceiptTrip entity = receiptTripRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));

        return mapper.toDTO(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getReceiptTripsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 출장 목록 조회 - projectIdx: {}", projectIdx);
        return receiptTripRepository.findByProjectIdxOrderByTripDateDesc(projectIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getReceiptTripsByAuthorIdx(Long authorIdx) {
        log.debug("작성자별 출장 목록 조회 - authorIdx: {}", authorIdx);
        return receiptTripRepository.findByAuthorIdxOrderByTripDateDesc(authorIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getReceiptTripsByStatus(String status) {
        log.debug("상태별 출장 목록 조회 - status: {}", status);
        return receiptTripRepository.findByStatusOrderByTripDateDesc(status)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReceiptTripDTO createReceiptTrip(ReceiptTripCreateDTO createDTO) {
        log.debug("출장 생성 - projectIdx: {}, authorIdx: {}", createDTO.getProjectIdx(), createDTO.getAuthorIdx());

        try {
            // 1. 문서번호 생성
            String documentNumber = generateDocumentNumber(createDTO.getProjectIdx());

        // 2. ApprovalDocument 메타데이터 저장
        String documentNo = "RECEIPT-TRIP-" + System.currentTimeMillis() + "-" + createDTO.getAuthorIdx();
        String title = "연구비증빙 출장";
        if (createDTO.getLocation() != null && !createDTO.getLocation().isEmpty()) {
            title = "연구비증빙 출장 - " + createDTO.getLocation();
        }

        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType("연구비증빙-출장")
                .drafterUserIdx(createDTO.getAuthorIdx())
                .content(createDTO.getContent())
                .createdUserIdx(createDTO.getAuthorIdx())
                .updatedUserIdx(createDTO.getAuthorIdx())
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
        log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                  savedDocument.getIdx(), savedDocument.getDocumentNo());

        // 3. 출장 Entity 생성 및 저장
        ReceiptTrip entity = mapper.toEntity(createDTO);
        entity.setDocumentNumber(documentNumber);
        entity.setDocumentIdx(savedDocument.getIdx());
        entity = receiptTripRepository.save(entity);

        // 3. 참석자 목록 저장
        if (createDTO.getAttendees() != null && !createDTO.getAttendees().isEmpty()) {
            final Long receiptTripIdx = entity.getIdx();
            List<ReceiptTripAttendee> attendees = createDTO.getAttendees().stream()
                    .map(dto -> mapper.toAttendeeEntity(dto, receiptTripIdx))
                    .collect(Collectors.toList());
            attendeeRepository.saveAll(attendees);
        }

            // 4. 저장된 데이터 재조회 (참석자 포함)
            ReceiptTrip savedEntity = receiptTripRepository.findByIdWithDetails(entity.getIdx())
                    .orElseThrow(() -> new IllegalStateException("저장된 출장 정보를 조회할 수 없습니다."));

            log.info("출장 생성 완료 - idx: {}, documentNumber: {}", savedEntity.getIdx(), documentNumber);
            return mapper.toDTO(savedEntity);

        } catch (Exception e) {
            log.error("연구비증빙 출장 생성 실패 - projectIdx: {}, authorIdx: {}, error: {}",
                      createDTO.getProjectIdx(), createDTO.getAuthorIdx(), e.getMessage(), e);
            throw new RuntimeException("연구비증빙 출장 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    @Transactional
    public ReceiptTripDTO updateReceiptTrip(Long idx, ReceiptTripUpdateDTO updateDTO) {
        log.debug("출장 수정 - idx: {}", idx);

        // 1. 기존 출장 조회
        ReceiptTrip entity = receiptTripRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));

        // 2. 출장 정보 업데이트
        mapper.updateEntity(entity, updateDTO);
        entity = receiptTripRepository.save(entity);

        // 3. 참석자 목록 업데이트 (기존 삭제 후 재생성)
        if (updateDTO.getAttendees() != null) {
            attendeeRepository.deleteByReceiptTripIdx(idx);

            if (!updateDTO.getAttendees().isEmpty()) {
                List<ReceiptTripAttendee> attendees = updateDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, idx))
                        .collect(Collectors.toList());
                attendeeRepository.saveAll(attendees);
            }
        }

        // 4. 수정된 데이터 재조회
        ReceiptTrip updatedEntity = receiptTripRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalStateException("수정된 출장 정보를 조회할 수 없습니다."));

        log.info("출장 수정 완료 - idx: {}", idx);
        return mapper.toDTO(updatedEntity);
    }

    @Override
    @Transactional
    public void deleteReceiptTrip(Long idx) {
        log.debug("출장 삭제 - idx: {}", idx);

        ReceiptTrip entity = receiptTripRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));

        // 연결된 ApprovalDocument 소프트 딜리트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(approvalDocument -> {
                LocalDateTime now = LocalDateTime.now();
                approvalDocument.setDeletedAt(now);
                approvalDocument.setDeletedUserIdx(entity.getAuthorIdx());
                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument soft deleted - documentIdx: {}, deletedAt: {}",
                        entity.getDocumentIdx(), now);
            });
        }

        receiptTripRepository.delete(entity);
        log.info("출장 삭제 완료 - idx: {}", idx);
    }

    @Override
    public String generateDocumentNumber(Long projectIdx) {
        // 문서번호 형식: RT-{projectIdx}-{YYYYMMDD}-{순번}
        // 예: RT-1-20250101-001

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = String.format("RT-%d-%s", projectIdx, dateStr);

        // 같은 날짜의 문서 개수 조회하여 순번 생성
        long count = receiptTripRepository.findAll().stream()
                .filter(rt -> rt.getDocumentNumber() != null && rt.getDocumentNumber().startsWith(prefix))
                .count();

        return String.format("%s-%03d", prefix, count + 1);
    }

    /**
     * 출장 비용 항목들의 합계 계산
     */
    private BigDecimal calculateTotalAmount(BigDecimal transportationFee,
                                            BigDecimal accommodationFee,
                                            BigDecimal mealFee,
                                            BigDecimal otherFee) {
        BigDecimal total = BigDecimal.ZERO;

        if (transportationFee != null) {
            total = total.add(transportationFee);
        }
        if (accommodationFee != null) {
            total = total.add(accommodationFee);
        }
        if (mealFee != null) {
            total = total.add(mealFee);
        }
        if (otherFee != null) {
            total = total.add(otherFee);
        }

        return total;
    }
}
