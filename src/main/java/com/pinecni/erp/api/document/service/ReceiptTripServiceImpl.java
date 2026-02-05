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
    private final com.pinecni.erp.api.approval.repository.DocumentSequenceRepository documentSequenceRepository;

    private static final String DOCUMENT_TYPE = "receipt_trip"; // 문서 타입 (DB 테이블 식별용)
    private static final String PREFIX = "RCT"; // 문서번호 prefix

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
            // 1. 문서번호 생성 (시퀀스 사용)
            String documentNo = generateDocumentNo();
        String title = "연구비증빙 출장";
        if (createDTO.getLocation() != null && !createDTO.getLocation().isEmpty()) {
            title = "연구비증빙 출장 - " + createDTO.getLocation();
        }

        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType("연구비증빙-출장")  // 화면 표시용
                .isProject(true)  // 프로젝트 문서로 표시
                .drafterUserIdx(createDTO.getAuthorIdx())
                .content(createDTO.getContent())
                .createdUserIdx(createDTO.getAuthorIdx())
                .updatedUserIdx(createDTO.getAuthorIdx())
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
        log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                  savedDocument.getIdx(), savedDocument.getDocumentNo());

        // 2. 출장 Entity 생성 및 저장
        ReceiptTrip entity = mapper.toEntity(createDTO);
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

            log.info("출장 생성 완료 - idx: {}, documentNo: {}", savedEntity.getIdx(), documentNo);
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

    /**
     * document_sequences 테이블을 이용한 문서번호 생성
     * 형식: prefix-year-last_number (예: RCT-2026-0001)
     */
    private String generateDocumentNo() {
        int currentYear = LocalDateTime.now().getYear();

        // 해당 연도의 시퀀스 조회 또는 생성
        com.pinecni.erp.entity.DocumentSequence sequence = documentSequenceRepository
                .findByDocumentTypeAndYear(DOCUMENT_TYPE, currentYear)
                .orElseGet(() -> {
                    com.pinecni.erp.entity.DocumentSequence newSequence = com.pinecni.erp.entity.DocumentSequence.builder()
                            .documentType(DOCUMENT_TYPE)
                            .prefix(PREFIX)
                            .year(currentYear)
                            .lastNumber(0)
                            .currentSequence(0)
                            .createdAt(LocalDateTime.now())
                            .build();
                    return documentSequenceRepository.save(newSequence);
                });

        // last_number 증가
        sequence.setLastNumber(sequence.getLastNumber() + 1);
        sequence.setUpdatedAt(LocalDateTime.now());
        documentSequenceRepository.save(sequence);

        // 문서번호 생성 (prefix-year-last_number, 4자리 패딩)
        return String.format("%s-%d-%04d", sequence.getPrefix(), sequence.getYear(), sequence.getLastNumber());
    }

    @Override
    public String generateDocumentNumber(Long projectIdx) {
        // 구형식 메서드 (하위 호환성 유지)
        return generateDocumentNo();
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
