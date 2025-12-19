package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import com.pinecni.erp.api.document.mapper.ReceiptMeetingMapper;
import com.pinecni.erp.api.project.repository.ReceiptMeetingAttendeeRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.entity.ReceiptMeeting;
import com.pinecni.erp.entity.ReceiptMeetingAttendee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
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

        // 1. 문서번호 생성
        String documentNumber = generateDocumentNumber(createDTO.getProjectIdx());

        // 2. 회의록 Entity 생성 및 저장
        ReceiptMeeting entity = mapper.toEntity(createDTO);
        entity.setDocumentNumber(documentNumber);
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
}
