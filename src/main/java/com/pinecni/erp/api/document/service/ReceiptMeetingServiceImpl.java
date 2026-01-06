package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import com.pinecni.erp.api.document.mapper.ReceiptMeetingMapper;
import com.pinecni.erp.api.project.repository.ReceiptMeetingAttendeeRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.entity.ReceiptMeeting;
import com.pinecni.erp.entity.ReceiptMeetingAttendee;
import com.pinecni.erp.entity.ApprovalDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 연구비증빙 회의록 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptMeetingServiceImpl implements ReceiptMeetingService {

    private final ReceiptMeetingRepository receiptMeetingRepository;
    private final ReceiptMeetingAttendeeRepository attendeeRepository;
    private final ReceiptMeetingMapper mapper;
    private final ApprovalDocumentRepository approvalDocumentRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getAllReceiptMeetings() {
        log.debug("전체 회의록 목록 조회");
        return receiptMeetingRepository.findAllByOrderByMeetingDateDesc()
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptMeetingDTO getReceiptMeetingById(Long idx) {
        log.debug("회의록 상세 조회 - idx: {}", idx);

        ReceiptMeeting entity = receiptMeetingRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        return mapper.toDTO(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 회의록 목록 조회 - projectIdx: {}", projectIdx);
        return receiptMeetingRepository.findByProjectIdxOrderByMeetingDateDesc(projectIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByAuthorIdx(Long authorIdx) {
        log.debug("작성자별 회의록 목록 조회 - authorIdx: {}", authorIdx);
        return receiptMeetingRepository.findByAuthorIdxOrderByMeetingDateDesc(authorIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByStatus(String status) {
        log.debug("상태별 회의록 목록 조회 - status: {}", status);
        return receiptMeetingRepository.findByStatusOrderByMeetingDateDesc(status)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReceiptMeetingDTO createReceiptMeeting(ReceiptMeetingCreateDTO createDTO) {
        log.debug("회의록 생성 - projectIdx: {}, authorIdx: {}", createDTO.getProjectIdx(), createDTO.getAuthorIdx());

        try {
            // 1. 문서번호 생성
            String documentNumber = generateDocumentNumber(createDTO.getProjectIdx());

        // 2. ApprovalDocument 메타데이터 저장
        String documentNo = "RECEIPT-MEETING-" + System.currentTimeMillis() + "-" + createDTO.getAuthorIdx();
        String title = "연구비증빙 회의록";
        if (createDTO.getPurpose() != null && !createDTO.getPurpose().isEmpty()) {
            title = "연구비증빙 회의록 - " + createDTO.getPurpose();
        }

        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType("연구비증빙-회의록")
                .drafterUserIdx(createDTO.getAuthorIdx())
                .content(createDTO.getContent())
                .createdUserIdx(createDTO.getAuthorIdx())
                .updatedUserIdx(createDTO.getAuthorIdx())
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
        log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                  savedDocument.getIdx(), savedDocument.getDocumentNo());

        // 3. 회의록 Entity 생성 및 저장
        ReceiptMeeting entity = mapper.toEntity(createDTO);
        entity.setDocumentNumber(documentNumber);
        entity.setDocumentIdx(savedDocument.getIdx());
        entity = receiptMeetingRepository.save(entity);

        // 3. 참석자 목록 저장
        if (createDTO.getAttendees() != null && !createDTO.getAttendees().isEmpty()) {
            final Long receiptMeetingIdx = entity.getIdx();
            List<ReceiptMeetingAttendee> attendees = createDTO.getAttendees().stream()
                    .map(dto -> mapper.toAttendeeEntity(dto, receiptMeetingIdx))
                    .collect(Collectors.toList());
            attendeeRepository.saveAll(attendees);
        }

            // 4. 저장된 데이터 재조회 (참석자 포함)
            ReceiptMeeting savedEntity = receiptMeetingRepository.findByIdWithDetails(entity.getIdx())
                    .orElseThrow(() -> new IllegalStateException("저장된 회의록을 조회할 수 없습니다."));

            log.info("회의록 생성 완료 - idx: {}, documentNumber: {}", savedEntity.getIdx(), documentNumber);
            return mapper.toDTO(savedEntity);

        } catch (Exception e) {
            log.error("연구비증빙 회의록 생성 실패 - projectIdx: {}, authorIdx: {}, error: {}",
                      createDTO.getProjectIdx(), createDTO.getAuthorIdx(), e.getMessage(), e);
            throw new RuntimeException("연구비증빙 회의록 저장 중 오류가 발생했습니다. approval_documents와 receipt_meeting이 모두 롤백됩니다.", e);
        }
    }

    @Override
    @Transactional
    public ReceiptMeetingDTO updateReceiptMeeting(Long idx, ReceiptMeetingUpdateDTO updateDTO) {
        log.debug("회의록 수정 - idx: {}", idx);

        // 1. 기존 회의록 조회
        ReceiptMeeting entity = receiptMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        // 2. 회의록 정보 업데이트
        mapper.updateEntity(entity, updateDTO);
        entity = receiptMeetingRepository.save(entity);

        // 3. 참석자 목록 업데이트 (기존 삭제 후 재생성)
        if (updateDTO.getAttendees() != null) {
            attendeeRepository.deleteByReceiptMeetingIdx(idx);

            if (!updateDTO.getAttendees().isEmpty()) {
                List<ReceiptMeetingAttendee> attendees = updateDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, idx))
                        .collect(Collectors.toList());
                attendeeRepository.saveAll(attendees);
            }
        }

        // 4. 수정된 데이터 재조회
        ReceiptMeeting updatedEntity = receiptMeetingRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalStateException("수정된 회의록을 조회할 수 없습니다."));

        log.info("회의록 수정 완료 - idx: {}", idx);
        return mapper.toDTO(updatedEntity);
    }

    @Override
    @Transactional
    public void deleteReceiptMeeting(Long idx) {
        log.debug("회의록 삭제 - idx: {}", idx);

        ReceiptMeeting entity = receiptMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        receiptMeetingRepository.delete(entity);
        log.info("회의록 삭제 완료 - idx: {}", idx);
    }

    @Override
    public String generateDocumentNumber(Long projectIdx) {
        // 문서번호 형식: RM-{projectIdx}-{YYYYMMDD}-{순번}
        // 예: RM-1-20250101-001

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = String.format("RM-%d-%s", projectIdx, dateStr);

        // 같은 날짜의 문서 개수 조회하여 순번 생성
        long count = receiptMeetingRepository.findAll().stream()
                .filter(rm -> rm.getDocumentNumber() != null && rm.getDocumentNumber().startsWith(prefix))
                .count();

        return String.format("%s-%03d", prefix, count + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> findDuplicateAttendee(String date, Long attendeeIdx) {
        log.debug("중복 참석자 검증 - date: {}, attendeeIdx: {}", date, attendeeIdx);

        try {
            // 날짜 파싱
            LocalDate meetingDate = LocalDate.parse(date);

            // 해당 날짜의 모든 회의록 조회
            List<ReceiptMeeting> meetings = receiptMeetingRepository.findAll().stream()
                    .filter(rm -> rm.getMeetingDate() != null && rm.getMeetingDate().equals(meetingDate))
                    .collect(Collectors.toList());

            List<Map<String, Object>> duplicates = new ArrayList<>();

            // 각 회의록의 참석자 확인
            for (ReceiptMeeting meeting : meetings) {
                List<ReceiptMeetingAttendee> attendees = attendeeRepository.findByReceiptMeetingIdxOrderByDisplayOrder(meeting.getIdx());

                // 해당 참석자가 포함되어 있는지 확인
                boolean hasDuplicate = attendees.stream()
                        .anyMatch(attendee -> attendee.getUserIdx().equals(attendeeIdx));

                if (hasDuplicate) {
                    Map<String, Object> info = new HashMap<>();
                    info.put("idx", meeting.getIdx());
                    info.put("title", meeting.getPurpose()); // purpose를 제목으로 사용
                    info.put("createdAt", meeting.getCreatedAt());
                    duplicates.add(info);
                }
            }

            return duplicates;
        } catch (Exception e) {
            log.error("중복 참석자 검증 중 오류 발생: {}", e.getMessage(), e);
            return List.of();
        }
    }
}
