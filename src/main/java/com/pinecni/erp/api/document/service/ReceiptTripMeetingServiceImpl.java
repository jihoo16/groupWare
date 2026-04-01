package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.project.repository.*;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingSessionRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 연구비증빙 출장+회의 통합 Service 구현체
 *
 * 저장 순서 (단일 트랜잭션):
 *   1. RCTM 문서번호 생성
 *   2. ApprovalDocument 저장 (isProject=true, drafterUserIdx=authorIdx)
 *   3. 일별 비용 합계 계산
 *   4. ReceiptTripMeeting 저장 (합계 캐시 포함)
 *   5. receipt_trip_meeting_daily_expense 저장
 *   6. 파일 첨부 저장
 *   7. 출장 참석자 저장 (participation_type='출장')
 *   8. 회의 참석자 저장 (participation_type='회의')
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptTripMeetingServiceImpl implements ReceiptTripMeetingService {

    private final ReceiptTripMeetingRepository receiptTripMeetingRepository;
    private final ReceiptTripMeetingDailyExpenseRepository dailyExpenseRepository;
    private final ReceiptTripMeetingAttachmentRepository attachmentRepository;
    private final ReceiptAttendeeRepository receiptAttendeeRepository;
    private final ReceiptTripMeetingSessionRepository sessionRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final ProjectCardRepository projectCardRepository;
    private final UserRepository userRepository;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-trip-meeting.pattern}")
    private String uploadPattern;

    private static final CodeConstants.DocumentType DOC_TYPE = CodeConstants.DocumentType.RECEIPT_TRIP_MEETING;

    @Override
    @Transactional
    public ReceiptTripMeetingResponseDTO createReceiptTripMeeting(
            ReceiptTripMeetingCreateDTO dto,
            Map<Integer, MultipartFile[]> meetingReceiptFilesMap,
            Map<Integer, MultipartFile[]> meetingDocumentFilesMap,
            MultipartFile[] tripReceiptFiles,
            MultipartFile[] tripDocumentFiles,
            Long currentUserIdx) {

        log.debug("출장+회의 통합 저장 - projectIdx: {}, drafterUserIdx: {}", dto.getProjectIdx(), dto.getDrafterUserIdx());

        // ── 1. 문서 번호 생성 ──────────────────────────────────────────
        String documentNo = documentSequenceService.generateDocumentNumber(DOC_TYPE.getCode(), DOC_TYPE.getPrefix(), currentUserIdx);

        // ── 2. ApprovalDocument 생성 ──────────────────────────────────
        //      drafterUserIdx = 문서상 작성자 (화면에서 선택)
        //      createdUserIdx = 실제 로그인한 저장자 (currentUserIdx)
        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(buildTitle(dto))
                .documentType(DOC_TYPE.getCode())
                .isProject(true)
                .drafterUserIdx(dto.getDrafterUserIdx())
                .content(dto.getTripContent())
                .createdUserIdx(currentUserIdx)
                .updatedUserIdx(currentUserIdx)
                .build();
        ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
        Long documentIdx = savedDocument.getIdx();
        log.debug("ApprovalDocument 생성 - idx: {}, documentNo: {}", documentIdx, documentNo);

        // ── 3. 일별 비용 합계 계산 ────────────────────────────────────
        List<ReceiptTripMeetingDailyExpenseDTO> dailyList =
                dto.getDailyExpenses() != null ? dto.getDailyExpenses() : Collections.emptyList();

        BigDecimal totalFee = dailyList.stream()
                .map(d -> orZero(d.getTransportationFee())
                        .add(orZero(d.getAccommodationFee()))
                        .add(orZero(d.getMealFee()))
                        .add(orZero(d.getOtherFee())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── 4. ReceiptTripMeeting 저장 ────────────────────────────────
        ReceiptTripMeeting entity = ReceiptTripMeeting.builder()
                .projectIdx(dto.getProjectIdx())
                .cardIdx(dto.getCardIdx())
                .documentIdx(documentIdx)
                .documentNumber(documentNo)
                .drafterUserIdx(dto.getDrafterUserIdx())
                // 출장
                .tripDate(dto.getTripDate())
                .requisitionDate(dto.getRequisitionDate())
                .duration(dto.getDuration() != null ? dto.getDuration() : 0)
                .location(dto.getLocation())
                .totalFee(totalFee)
                .purpose(dto.getPurpose())
                .content(dto.getTripContent())
                // 감사
                .createdUserIdx(currentUserIdx)
                .updatedUserIdx(currentUserIdx)
                .build();

        entity = receiptTripMeetingRepository.save(entity);
        final Long rtmIdx = entity.getIdx();
        log.debug("ReceiptTripMeeting 저장 완료 - idx: {}", rtmIdx);

        // ── 5. 일별 비용 명세 저장 ────────────────────────────────────
        if (!dailyList.isEmpty()) {
            List<ReceiptTripMeetingDailyExpense> dailyEntities = dailyList.stream()
                    .map(d -> {
                        LocalDate dayDate = resolveDayDate(dto.getTripDate(), d);
                        return ReceiptTripMeetingDailyExpense.builder()
                                .receiptTripMeetingIdx(rtmIdx)
                                .expenseDate(dayDate)
                                .transportationFee(orZero(d.getTransportationFee()))
                                .accommodationFee(orZero(d.getAccommodationFee()))
                                .mealFee(orZero(d.getMealFee()))
                                .otherFee(orZero(d.getOtherFee()))
                                .build();
                    })
                    .collect(Collectors.toList());
            dailyExpenseRepository.saveAll(dailyEntities);
            log.debug("일별 비용 {}일분 저장 완료", dailyEntities.size());
        }

        // ── 6. 출장 파일 저장 (session_idx = null) ───────────────────────
        saveAttachments(entity, tripReceiptFiles,  "TRIP_RECEIPT",  currentUserIdx, null);
        saveAttachments(entity, tripDocumentFiles, "TRIP_DOCUMENT", currentUserIdx, null);

        // ── 7. 출장 참석자 저장 ───────────────────────────────────────────
        LocalDateTime now = LocalDateTime.now();
        if (dto.getTripAttendees() != null && !dto.getTripAttendees().isEmpty()) {
            List<ReceiptAttendee> tripAttendees = dto.getTripAttendees().stream()
                    .map(a -> ReceiptAttendee.builder()
                            .documentTypePrefix("RCTM")
                            .receiptIdx(rtmIdx)
                            .projectIdx(dto.getProjectIdx())
                            .cardIdx(dto.getCardIdx())
                            .documentDate(dto.getTripDate())
                            .participationType("출장")
                            .userIdx(a.getUserIdx())
                            .isExternal(false)
                            .displayOrder(a.getDisplayOrder() != null ? a.getDisplayOrder() : 0)
                            .createdAt(now)
                            .createdUserIdx(currentUserIdx)
                            .updatedAt(now)
                            .updatedUserIdx(currentUserIdx)
                            .isDeleted(false)
                            .build())
                    .collect(Collectors.toList());
            receiptAttendeeRepository.saveAll(tripAttendees);
            log.debug("출장 참석자 {}명 저장 완료", tripAttendees.size());
        }

        // ── 8. 회의 세션 저장 (참석자 중복 검증 + 참석자 저장 + 파일 저장 포함) ─
        if (dto.getMeetingSessions() != null && !dto.getMeetingSessions().isEmpty()) {
            log.info("[DEBUG] 회의세션 수: {}", dto.getMeetingSessions().size());
            dto.getMeetingSessions().forEach(s -> log.info("[DEBUG] 세션 - date:{} start:{} end:{} attendees:{}",
                    s.getMeetingDate(), s.getStartTime(), s.getEndTime(),
                    s.getMeetingAttendees() == null ? 0 : s.getMeetingAttendees().stream()
                            .filter(a -> !Boolean.TRUE.equals(a.getIsExternal()))
                            .map(a -> String.valueOf(a.getUserIdx()))
                            .collect(java.util.stream.Collectors.joining(","))));
            saveMeetingSessions(dto.getMeetingSessions(), entity,
                    dto.getProjectIdx(), dto.getCardIdx(), currentUserIdx,
                    meetingReceiptFilesMap, meetingDocumentFilesMap, null);
        } else {
            log.info("[DEBUG] meetingSessions is null or empty → 회의 세션 저장 생략");
        }

        log.info("출장+회의 통합 저장 완료 - rtmIdx: {}, documentNo: {}", rtmIdx, documentNo);

        return ReceiptTripMeetingResponseDTO.builder()
                .receiptTripMeetingIdx(rtmIdx)
                .documentIdx(documentIdx)
                .documentNumber(documentNo)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // 조회
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public ReceiptTripMeetingResponseDTO getReceiptTripMeetingById(Long idx) {
        log.debug("출장+회의 상세 조회 - idx: {}", idx);

        // 먼저 documentIdx(전자결재 문서 ID)로 조회 시도
        Optional<ReceiptTripMeeting> entityByDocumentIdx = receiptTripMeetingRepository.findByDocumentIdx(idx);
        if (entityByDocumentIdx.isPresent()) {
            log.debug("documentIdx로 출장+회의 조회 성공 - documentIdx: {}", idx);
            ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(entityByDocumentIdx.get().getIdx())
                    .orElseThrow(() -> new IllegalArgumentException("출장+회의 정보를 찾을 수 없습니다. idx: " + idx));
            if (Boolean.TRUE.equals(entity.getDeleted())) {
                throw new IllegalArgumentException("삭제된 출장+회의입니다. idx: " + idx);
            }
            return toDetailDTO(entity);
        }

        // documentIdx로 조회 실패 시, receipt_trip_meeting.idx로 직접 조회
        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장+회의 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 출장+회의입니다. idx: " + idx);
        }
        return toDetailDTO(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 출장+회의 목록 조회 - projectIdx: {}", projectIdx);
        return receiptTripMeetingRepository.findByProjectIdxOrderByTripDateDesc(projectIdx)
                .stream()
                .filter(e -> !Boolean.TRUE.equals(e.getDeleted()))
                .map(this::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingsByDrafterUserIdx(Long drafterUserIdx) {
        log.debug("작성자별 출장+회의 목록 조회 - drafterUserIdx: {}", drafterUserIdx);
        return receiptTripMeetingRepository.findByDrafterUserIdxOrderByTripDateDesc(drafterUserIdx)
                .stream()
                .filter(e -> !Boolean.TRUE.equals(e.getDeleted()))
                .map(this::toSimpleDTO)
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════
    // 수정
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public ReceiptTripMeetingResponseDTO updateReceiptTripMeeting(
            Long idx,
            ReceiptTripMeetingCreateDTO updateDTO,
            Map<Integer, MultipartFile[]> meetingReceiptFilesMap,
            Map<Integer, MultipartFile[]> meetingDocumentFilesMap,
            MultipartFile[] tripReceiptFiles,
            MultipartFile[] tripDocumentFiles,
            Long currentUserIdx) {

        log.debug("출장+회의 수정 - idx: {}, currentUserIdx: {}", idx, currentUserIdx);

        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장+회의 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 출장+회의입니다. idx: " + idx);
        }

        // 1. 일별 비용 합계 재계산
        List<ReceiptTripMeetingDailyExpenseDTO> dailyList =
                updateDTO.getDailyExpenses() != null ? updateDTO.getDailyExpenses() : Collections.emptyList();
        BigDecimal totalFee = dailyList.stream()
                .map(d -> orZero(d.getTransportationFee())
                        .add(orZero(d.getAccommodationFee()))
                        .add(orZero(d.getMealFee()))
                        .add(orZero(d.getOtherFee())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. 엔티티 필드 수정
        entity.setProjectIdx(updateDTO.getProjectIdx());
        entity.setCardIdx(updateDTO.getCardIdx());
        if (updateDTO.getDrafterUserIdx() != null) {
            entity.setDrafterUserIdx(updateDTO.getDrafterUserIdx());
        }
        entity.setTripDate(updateDTO.getTripDate());
        entity.setRequisitionDate(updateDTO.getRequisitionDate());
        entity.setDuration(updateDTO.getDuration() != null ? updateDTO.getDuration() : 0);
        entity.setLocation(updateDTO.getLocation());
        entity.setPurpose(updateDTO.getPurpose());
        entity.setContent(updateDTO.getTripContent());
        entity.setTotalFee(totalFee);
        entity.setUpdatedUserIdx(currentUserIdx);
        entity = receiptTripMeetingRepository.save(entity);

        // 3. 일별 비용 재저장 (기존 삭제 후 재삽입)
        dailyExpenseRepository.deleteByReceiptTripMeetingIdx(idx);
        if (!dailyList.isEmpty()) {
            final Long rtmIdx = entity.getIdx();
            List<ReceiptTripMeetingDailyExpense> dailyEntities = dailyList.stream()
                    .map(d -> ReceiptTripMeetingDailyExpense.builder()
                            .receiptTripMeetingIdx(rtmIdx)
                            .expenseDate(resolveDayDate(updateDTO.getTripDate(), d))
                            .transportationFee(orZero(d.getTransportationFee()))
                            .accommodationFee(orZero(d.getAccommodationFee()))
                            .mealFee(orZero(d.getMealFee()))
                            .otherFee(orZero(d.getOtherFee()))
                            .build())
                    .collect(Collectors.toList());
            dailyExpenseRepository.saveAll(dailyEntities);
        }

        // 4. 참석자 소프트 딜리트 후 재삽입
        receiptAttendeeRepository.softDeleteByReceiptTripMeetingIdx(idx, currentUserIdx);
        LocalDateTime now = LocalDateTime.now();
        final Long rtmIdx = entity.getIdx();

        if (updateDTO.getTripAttendees() != null && !updateDTO.getTripAttendees().isEmpty()) {
            List<ReceiptAttendee> tripAttendees = updateDTO.getTripAttendees().stream()
                    .map(a -> ReceiptAttendee.builder()
                            .documentTypePrefix("RCTM")
                            .receiptIdx(rtmIdx)
                            .projectIdx(updateDTO.getProjectIdx())
                            .cardIdx(updateDTO.getCardIdx())
                            .documentDate(updateDTO.getTripDate())
                            .participationType("출장")
                            .userIdx(a.getUserIdx())
                            .isExternal(false)
                            .displayOrder(a.getDisplayOrder() != null ? a.getDisplayOrder() : 0)
                            .createdAt(now)
                            .createdUserIdx(currentUserIdx)
                            .updatedAt(now)
                            .updatedUserIdx(currentUserIdx)
                            .isDeleted(false)
                            .build())
                    .collect(Collectors.toList());
            receiptAttendeeRepository.saveAll(tripAttendees);
        }

        // 5. 회의 세션 수정 (기존 소프트 딜리트 후 재삽입)
        if (updateDTO.getMeetingSessions() != null && !updateDTO.getMeetingSessions().isEmpty()) {
            List<ReceiptTripMeetingSession> existingSessions = sessionRepository.findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(idx);
            int newSessionCount = updateDTO.getMeetingSessions().size();

            // position → oldSessionIdx 매핑 (첨부파일 session_idx 재연결용)
            Map<Integer, Long> posToOldSessionIdx = new java.util.LinkedHashMap<>();
            for (int i = 0; i < existingSessions.size(); i++) {
                posToOldSessionIdx.put(i, existingSessions.get(i).getIdx());
            }

            for (int i = 0; i < existingSessions.size(); i++) {
                ReceiptTripMeetingSession existingSession = existingSessions.get(i);

                // 참석자 소프트 딜리트
                receiptAttendeeRepository.findBySessionIdxAndParticipationTypeAndIsDeletedFalseOrderByDisplayOrder(existingSession.getIdx(), "회의")
                        .forEach(a -> {
                            a.setIsDeleted(true);
                            a.setDeletedAt(now);
                            a.setDeletedUserIdx(currentUserIdx);
                            receiptAttendeeRepository.save(a);
                        });

                // 첨부파일 소프트 딜리트: 제거된 세션(position >= 새 세션 수) 또는 해당 세션에 새 파일이 업로드되는 경우만
                boolean sessionRemoved = i >= newSessionCount;
                boolean hasNewFiles = meetingReceiptFilesMap.containsKey(i) || meetingDocumentFilesMap.containsKey(i);
                if (sessionRemoved || hasNewFiles) {
                    attachmentRepository.findBySessionIdxAndDeletedFalseOrderByIdxAsc(existingSession.getIdx())
                            .forEach(a -> {
                                a.setDeleted(true);
                                a.setDeletedAt(now);
                                a.setDeletedUserIdx(currentUserIdx);
                                attachmentRepository.save(a);
                            });
                }
            }

            // 기존 세션 하드 딜리트 후 재삽입 (세션은 내부 구현 단위 → 하드 딜리트 허용)
            sessionRepository.deleteByReceiptTripMeetingIdx(idx);
            saveMeetingSessions(updateDTO.getMeetingSessions(), entity,
                    updateDTO.getProjectIdx(), updateDTO.getCardIdx(), currentUserIdx,
                    meetingReceiptFilesMap, meetingDocumentFilesMap, idx);

            // 새로 생성된 세션 PK 조회 후 보존된 첨부파일의 session_idx 재연결
            List<ReceiptTripMeetingSession> newSessions = sessionRepository.findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(idx);
            for (int i = 0; i < newSessions.size() && i < existingSessions.size(); i++) {
                boolean hasNewFilesForSession = meetingReceiptFilesMap.containsKey(i) || meetingDocumentFilesMap.containsKey(i);
                if (!hasNewFilesForSession) {
                    Long oldSessionIdx = posToOldSessionIdx.get(i);
                    Long newSessionIdx = newSessions.get(i).getIdx();
                    if (oldSessionIdx != null && !oldSessionIdx.equals(newSessionIdx)) {
                        attachmentRepository.updateSessionIdxByOldIdx(oldSessionIdx, newSessionIdx);
                    }
                }
            }
        }

        // 6. 출장 파일 저장 + 첨부파일 표시명 재정렬
        saveAttachments(entity, tripReceiptFiles,  "TRIP_RECEIPT",  currentUserIdx, null);
        saveAttachments(entity, tripDocumentFiles, "TRIP_DOCUMENT", currentUserIdx, null);
        renameAttachments(entity);

        // 7. ApprovalDocument 제목 업데이트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(doc -> {
                doc.setTitle(buildTitle(updateDTO));
                doc.setContent(updateDTO.getTripContent());
                doc.setUpdatedUserIdx(currentUserIdx);
                approvalDocumentRepository.save(doc);
            });
        }

        log.info("출장+회의 수정 완료 - idx: {}", idx);
        return toDetailDTO(entity);
    }

    // ══════════════════════════════════════════════════════════════
    // 삭제
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public void deleteReceiptTripMeeting(Long idx, Long deletedUserIdx) {
        log.debug("출장+회의 소프트 딜리트 - idx: {}", idx);

        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장+회의 정보를 찾을 수 없습니다. idx: " + idx));

        LocalDateTime now = LocalDateTime.now();

        // 1. 참석자 소프트 딜리트
        receiptAttendeeRepository.softDeleteByReceiptTripMeetingIdx(idx, deletedUserIdx);
        log.debug("ReceiptAttendee 소프트 딜리트 완료 - rtmIdx: {}", idx);

        // 2. 첨부파일 소프트 딜리트
        attachmentRepository.softDeleteByReceiptTripMeetingIdx(idx, deletedUserIdx);
        log.debug("ReceiptTripMeetingAttachment 소프트 딜리트 완료 - rtmIdx: {}", idx);

        // 3. 회의 세션 소프트 딜리트
        sessionRepository.findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(idx).forEach(s -> {
            s.setIsDeleted(true);
            s.setDeletedAt(now);
            s.setDeletedUserIdx(deletedUserIdx);
            sessionRepository.save(s);
        });
        log.debug("ReceiptTripMeetingSession 소프트 딜리트 완료 - rtmIdx: {}", idx);

        // 4. ApprovalDocument 소프트 딜리트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(doc -> {
                doc.setDeletedAt(now);
                doc.setDeletedUserIdx(deletedUserIdx);
                approvalDocumentRepository.save(doc);
                log.debug("ApprovalDocument 소프트 딜리트 - idx: {}", entity.getDocumentIdx());
            });
        }

        // 4. 본체 소프트 딜리트
        entity.setDeleted(true);
        entity.setDeletedAt(now);
        entity.setDeletedUserIdx(deletedUserIdx);
        receiptTripMeetingRepository.save(entity);

        log.info("출장+회의 소프트 딜리트 완료 - idx: {}", idx);
    }

    // ══════════════════════════════════════════════════════════════
    // 첨부파일 관리
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripMeetingAttachmentDTO> getAttachmentsByReceiptTripMeetingIdx(Long receiptTripMeetingIdx) {
        return attachmentRepository
                .findByReceiptTripMeetingIdxAndDeletedFalseOrderByIdxAsc(receiptTripMeetingIdx)
                .stream()
                .map(this::toAttachmentDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptTripMeetingAttachmentDTO getAttachmentById(Long attachmentIdx) {
        ReceiptTripMeetingAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
        return toAttachmentDTO(attachment);
    }

    @Override
    @Transactional
    public void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx) {
        ReceiptTripMeetingAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
        attachment.setDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now());
        attachment.setDeletedUserIdx(deletedUserIdx);
        attachmentRepository.save(attachment);
        log.debug("첨부파일 소프트 딜리트 완료 - idx: {}", attachmentIdx);
    }

    @Override
    @Transactional
    public void addAttachments(
            Long idx,
            Map<Integer, MultipartFile[]> meetingReceiptFilesMap,
            Map<Integer, MultipartFile[]> meetingDocumentFilesMap,
            MultipartFile[] tripReceiptFiles,
            MultipartFile[] tripDocumentFiles,
            Long currentUserIdx) {

        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장+회의 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 출장+회의입니다. idx: " + idx);
        }

        // 세션 position → DB PK 매핑 (displayOrder 오름차순)
        List<ReceiptTripMeetingSession> sessions =
                sessionRepository.findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(idx);

        meetingReceiptFilesMap.forEach((position, files) -> {
            Long sessionIdx = position < sessions.size() ? sessions.get(position).getIdx() : null;
            saveAttachments(entity, files, "MEETING_RECEIPT", currentUserIdx, sessionIdx);
        });
        meetingDocumentFilesMap.forEach((position, files) -> {
            Long sessionIdx = position < sessions.size() ? sessions.get(position).getIdx() : null;
            saveAttachments(entity, files, "MEETING_DOCUMENT", currentUserIdx, sessionIdx);
        });
        saveAttachments(entity, tripReceiptFiles,  "TRIP_RECEIPT",  currentUserIdx, null);
        saveAttachments(entity, tripDocumentFiles, "TRIP_DOCUMENT", currentUserIdx, null);
        renameAttachments(entity);
        log.debug("addAttachments 완료 - receiptTripMeetingIdx: {}", idx);
    }

    // ══════════════════════════════════════════════════════════════
    // 파일 저장
    // ══════════════════════════════════════════════════════════════

    private void saveAttachments(ReceiptTripMeeting rtm, MultipartFile[] files,
                                 String attachmentType, Long uploadUserIdx, Long sessionIdx) {
        if (files == null || files.length == 0) return;

        String cardLastDigits = "no-card";
        if (rtm.getCardIdx() != null) {
            var card = projectCardRepository.findById(rtm.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }

        String year         = String.valueOf(rtm.getTripDate().getYear());
        String date         = rtm.getTripDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String relativePath = uploadPattern
                .replace("{projectIdx}",     String.valueOf(rtm.getProjectIdx()))
                .replace("{cardLastDigits}", cardLastDigits)
                .replace("{year}",           year)
                .replace("{date}",           date);
        String fullUploadPath = baseDir + File.separator + relativePath.replace("/", File.separator);

        try {
            Files.createDirectories(Paths.get(fullUploadPath));
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다: " + fullUploadPath, e);
        }

        String displayDateStr   = rtm.getTripDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        BigDecimal totalAmount  = calcTotal(rtm);
        String displayAmountStr = String.format("%,d원", totalAmount.longValue());
        String displayDocType;
        switch (attachmentType) {
            case "MEETING_RECEIPT":  displayDocType = "회의_영수증";  break;
            case "MEETING_DOCUMENT": displayDocType = "회의_공식문서"; break;
            case "TRIP_RECEIPT":     displayDocType = "출장_영수증";  break;
            case "TRIP_DOCUMENT":    displayDocType = "출장_공식문서"; break;
            default:                 displayDocType = "영수증";       break;
        }
        String displayBaseName  = cardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_회의출장_" + displayDocType;

        long existingCount = attachmentRepository
                .countByReceiptTripMeetingIdxAndAttachmentTypeAndDeletedFalse(rtm.getIdx(), attachmentType);
        int savedCount = 0;

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                String actualName = file.getOriginalFilename();
                if (actualName == null) actualName = "unnamed_file";
                String extension = "";
                int dot = actualName.lastIndexOf('.');
                if (dot > 0) extension = actualName.substring(dot);

                long seq = existingCount + savedCount + 1;
                String displayFilename = displayBaseName + "_" + seq + extension;

                String timestamp      = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid           = UUID.randomUUID().toString().substring(0, 8);
                String storedFilename = timestamp + "_" + uuid + extension;

                Path filePath = Paths.get(fullUploadPath, storedFilename);
                Files.copy(file.getInputStream(), filePath);

                ReceiptTripMeetingAttachment attachment = ReceiptTripMeetingAttachment.builder()
                        .receiptTripMeetingIdx(rtm.getIdx())
                        .sessionIdx(sessionIdx)
                        .originalFilename(displayFilename)
                        .storedFilename(storedFilename)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();
                attachmentRepository.save(attachment);
                savedCount++;
                log.debug("파일 저장 완료 - {}", displayFilename);
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 헬퍼
    // ══════════════════════════════════════════════════════════════

    private String buildTitle(ReceiptTripMeetingCreateDTO dto) {
        StringBuilder sb = new StringBuilder("연구비증빙 출장+회의");
        if (dto.getLocation() != null && !dto.getLocation().isEmpty()) {
            sb.append(" - ").append(dto.getLocation());
        }
        if (dto.getTripDate() != null) {
            sb.append(" (").append(dto.getTripDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))).append(")");
        }
        return sb.toString();
    }

    private BigDecimal calcTotal(ReceiptTripMeeting rtm) {
        return rtm.getTotalFee() != null ? rtm.getTotalFee() : BigDecimal.ZERO;
    }


    private LocalDate resolveDayDate(LocalDate tripDate, ReceiptTripMeetingDailyExpenseDTO d) {
        return d.getExpenseDate() != null ? d.getExpenseDate() : tripDate;
    }

    private BigDecimal orZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    // ══════════════════════════════════════════════════════════════
    // [W-6] 회의 참석자 시간 중복 검증
    // ══════════════════════════════════════════════════════════════

    /**
     * 회의 참석자 시간대 겹침 검증
     * - 같은 날짜/프로젝트에서 겹치는 시간대에 동일 참석자(내부 인원)가 있는지 확인
     *
     * @param meetingDate       회의 날짜
     * @param startTime         회의 시작 시간
     * @param endTime           회의 종료 시간
     * @param projectIdx        프로젝트 IDX
     * @param attendees         회의 참석자 DTO 목록
     * @param excludeReceiptIdx 수정 시 자기 자신 제외용 (신규 생성 시 null)
     */
    private void validateMeetingAttendeeDuplicates(
            LocalDate meetingDate,
            LocalTime startTime,
            LocalTime endTime,
            Long projectIdx,
            List<ReceiptMeetingAttendeeDTO> attendees,
            Long excludeReceiptIdx) {

        if (attendees == null || attendees.isEmpty()) return;
        if (meetingDate == null || startTime == null || endTime == null) return;

        log.info("[DEBUG] RCTM 회의 참석자 중복 검증 시작 - 날짜: {}, 시간: {} ~ {}, 프로젝트: {}, 내부참석자: {}명",
                meetingDate, startTime, endTime, projectIdx,
                attendees.stream().filter(a -> !Boolean.TRUE.equals(a.getIsExternal())).count());

        for (ReceiptMeetingAttendeeDTO attendee : attendees) {
            if (attendee.getUserIdx() == null) continue;

            boolean isExt = Boolean.TRUE.equals(attendee.getIsExternal());

            List<ReceiptAttendee> candidates;
            if (excludeReceiptIdx != null) {
                candidates = receiptAttendeeRepository.findByUserAndProjectAndDateExcluding(
                        attendee.getUserIdx(), projectIdx, meetingDate, excludeReceiptIdx, "RCTM");
            } else {
                candidates = receiptAttendeeRepository.findByUserAndProjectAndDateAllCards(
                        attendee.getUserIdx(), projectIdx, meetingDate);
            }

            List<ReceiptAttendee> withTime = candidates.stream()
                    .filter(a -> a.getStartTime() != null && a.getEndTime() != null)
                    // is_external 타입 일치 필터 (내부 idx ↔ 외부 idx 공간 혼용 방지)
                    .filter(a -> Boolean.TRUE.equals(a.getIsExternal()) == isExt)
                    .collect(Collectors.toList());
            log.info("[DEBUG] userIdx:{} isExt:{} candidates:{} withTime:{}", attendee.getUserIdx(), isExt, candidates.size(), withTime.size());

            for (ReceiptAttendee existing : withTime) {
                if (isTimeOverlap(startTime, endTime, existing.getStartTime(), existing.getEndTime())) {
                    String attendeeName = attendee.getName() != null ? attendee.getName() : "알 수 없음";
                    String docType = switch (existing.getDocumentTypePrefix() != null
                            ? existing.getDocumentTypePrefix() : "") {
                        case "RCM"  -> "회의록";
                        case "RCO"  -> "야근식대";
                        case "RCT"  -> "출장";
                        case "RCTM" -> "출장+회의";
                        default     -> existing.getDocumentTypePrefix();
                    };
                    String errorMessage = String.format(
                            "참석자 '%s'이(가) 같은 날짜 및 시간대에 이미 다른 문서에 참석 중입니다.\n\n" +
                                    "- 문서 유형: %s\n" +
                                    "- 날짜: %s\n" +
                                    "- 시간: %s ~ %s\n\n" +
                                    "시간을 변경하거나 참석자를 제외해주세요.",
                            attendeeName, docType,
                            existing.getDocumentDate(),
                            existing.getStartTime(), existing.getEndTime()
                    );
                    log.warn("RCTM 회의 참석자 중복 발견 - userIdx: {}, 기존 문서: {} {}",
                            attendee.getUserIdx(), docType, existing.getReceiptIdx());
                    throw new IllegalStateException(errorMessage);
                }
            }
        }

        log.debug("RCTM 회의 참석자 중복 검증 완료 - 중복 없음");
    }

    private boolean isTimeOverlap(LocalTime start1, LocalTime end1,
                                   LocalTime start2, LocalTime end2) {
        return start1.isBefore(end2) && end1.isAfter(start2);
    }

    /**
     * 동일 RCTM 내 세션들 간 시간 겹침 검증
     * 같은 출장 내 두 회의는 동시에 진행될 수 없음
     */
    private void validateInterSessionTimeOverlap(List<MeetingSessionDTO> sessions) {
        for (int i = 0; i < sessions.size(); i++) {
            MeetingSessionDTO a = sessions.get(i);
            if (a.getMeetingDate() == null || a.getStartTime() == null || a.getEndTime() == null) continue;
            for (int j = i + 1; j < sessions.size(); j++) {
                MeetingSessionDTO b = sessions.get(j);
                if (b.getMeetingDate() == null || b.getStartTime() == null || b.getEndTime() == null) continue;
                if (a.getMeetingDate().equals(b.getMeetingDate()) &&
                        isTimeOverlap(a.getStartTime(), a.getEndTime(), b.getStartTime(), b.getEndTime())) {
                    throw new IllegalStateException(String.format(
                            "%d번째 회의(%s ~ %s)와 %d번째 회의(%s ~ %s)가 같은 날짜(%s)에 시간이 겹칩니다.\n" +
                            "같은 출장 내 회의는 동시에 진행할 수 없습니다.",
                            i + 1, a.getStartTime(), a.getEndTime(),
                            j + 1, b.getStartTime(), b.getEndTime(),
                            a.getMeetingDate()
                    ));
                }
            }
        }
    }

    /**
     * 다중 회의 세션 저장 헬퍼
     * 세션 저장 → 각 세션의 참석자 중복 검증 → 참석자 저장 → 세션별 첨부파일 저장
     *
     * @param receiptFilesMap   key=회의 블록 순서(0,1,...) value=회의 영수증 파일 배열
     * @param documentFilesMap  key=회의 블록 순서(0,1,...) value=회의 공식문서 파일 배열
     * @param excludeRtmIdx     수정 시 중복 검증 자기 자신 제외용 (신규 시 null)
     */
    private void saveMeetingSessions(List<MeetingSessionDTO> sessions, ReceiptTripMeeting entity,
                                     Long projectIdx, Long cardIdx, Long currentUserIdx,
                                     Map<Integer, MultipartFile[]> receiptFilesMap,
                                     Map<Integer, MultipartFile[]> documentFilesMap,
                                     Long excludeRtmIdx) {
        // 세션 간 시간 겹침 선검증 (같은 출장 내 두 회의는 동시 진행 불가)
        validateInterSessionTimeOverlap(sessions);

        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < sessions.size(); i++) {
            MeetingSessionDTO sessionDTO = sessions.get(i);

            // 참석자 시간 중복 검증 (세션별)
            validateMeetingAttendeeDuplicates(
                    sessionDTO.getMeetingDate(), sessionDTO.getStartTime(), sessionDTO.getEndTime(),
                    projectIdx, sessionDTO.getMeetingAttendees(), excludeRtmIdx);

            ReceiptTripMeetingSession session = ReceiptTripMeetingSession.builder()
                    .receiptTripMeetingIdx(entity.getIdx())
                    .displayOrder(i)
                    .authorIdx(sessionDTO.getMeetingDrafterUserIdx())
                    .meetingDate(sessionDTO.getMeetingDate())
                    .startTime(sessionDTO.getStartTime())
                    .endTime(sessionDTO.getEndTime())
                    .location(sessionDTO.getMeetingLocation() != null && !sessionDTO.getMeetingLocation().isBlank()
                            ? sessionDTO.getMeetingLocation() : entity.getLocation())
                    .purpose(sessionDTO.getMeetingPurpose())
                    .content(sessionDTO.getMeetingContent())
                    .amount(sessionDTO.getMeetingAmount() != null ? sessionDTO.getMeetingAmount() : BigDecimal.ZERO)
                    .createdUserIdx(currentUserIdx)
                    .updatedUserIdx(currentUserIdx)
                    .build();
            ReceiptTripMeetingSession savedSession = sessionRepository.save(session);
            Long sessionIdx = savedSession.getIdx();

            // 세션 참석자 저장
            if (sessionDTO.getMeetingAttendees() != null && !sessionDTO.getMeetingAttendees().isEmpty()) {
                List<ReceiptAttendee> sessionAttendees = sessionDTO.getMeetingAttendees().stream()
                        .map(a -> ReceiptAttendee.builder()
                                .documentTypePrefix("RCTM")
                                .receiptIdx(entity.getIdx())
                                .sessionIdx(sessionIdx)
                                .projectIdx(projectIdx)
                                .cardIdx(cardIdx)
                                .documentDate(sessionDTO.getMeetingDate())
                                .startTime(sessionDTO.getStartTime())
                                .endTime(sessionDTO.getEndTime())
                                .participationType("회의")
                                .userIdx(a.getUserIdx())
                                .isExternal(Boolean.TRUE.equals(a.getIsExternal()))
                                .displayOrder(a.getDisplayOrder() != null ? a.getDisplayOrder() : 0)
                                .createdAt(now)
                                .createdUserIdx(currentUserIdx)
                                .updatedAt(now)
                                .updatedUserIdx(currentUserIdx)
                                .isDeleted(false)
                                .build())
                        .collect(Collectors.toList());
                receiptAttendeeRepository.saveAll(sessionAttendees);
            }

            // 세션별 첨부파일 저장 (session_idx 연결)
            if (receiptFilesMap != null && receiptFilesMap.containsKey(i)) {
                saveAttachments(entity, receiptFilesMap.get(i), "MEETING_RECEIPT", currentUserIdx, sessionIdx);
            }
            if (documentFilesMap != null && documentFilesMap.containsKey(i)) {
                saveAttachments(entity, documentFilesMap.get(i), "MEETING_DOCUMENT", currentUserIdx, sessionIdx);
            }
        }
        log.debug("다중 회의 세션 {}건 저장 완료", sessions.size());
    }

    // ══════════════════════════════════════════════════════════════
    // DTO 변환 헬퍼
    // ══════════════════════════════════════════════════════════════

    /** 상세 조회용 DTO (참석자, 첨부파일, 일별비용 포함) */
    private ReceiptTripMeetingResponseDTO toDetailDTO(ReceiptTripMeeting entity) {
        log.debug("[DEBUG] toDetailDTO - idx:{}, drafterUserIdx:{}", entity.getIdx(), entity.getDrafterUserIdx());
        List<ReceiptTripMeetingDailyExpense> expenses = dailyExpenseRepository
                .findByReceiptTripMeetingIdxOrderByExpenseDateAsc(entity.getIdx());
        List<ReceiptAttendee> tripAttendeesRaw = receiptAttendeeRepository
                .findByReceiptTripMeetingIdxAndParticipationType(entity.getIdx(), "출장");
        List<ReceiptTripMeetingAttachment> attachments = attachmentRepository
                .findByReceiptTripMeetingIdxAndDeletedFalseOrderByIdxAsc(entity.getIdx());

        // 다중 회의 세션 로드
        List<ReceiptTripMeetingSession> sessions = sessionRepository
                .findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(entity.getIdx());

        List<MeetingSessionDTO> meetingSessionDTOs;
        if (!sessions.isEmpty()) {
            // 세션 기반 (다중 회의)
            meetingSessionDTOs = sessions.stream().map(session -> {
                List<ReceiptAttendee> sessionAttendees = receiptAttendeeRepository
                        .findBySessionIdxAndParticipationTypeAndIsDeletedFalseOrderByDisplayOrder(session.getIdx(), "회의");
                return MeetingSessionDTO.builder()
                        .sessionIdx(session.getIdx())
                        .displayOrder(session.getDisplayOrder())
                        .meetingDate(session.getMeetingDate())
                        .startTime(session.getStartTime())
                        .endTime(session.getEndTime())
                        .meetingLocation(session.getLocation())
                        .meetingPurpose(session.getPurpose())
                        .meetingContent(session.getContent())
                        .meetingDrafterUserIdx(session.getAuthorIdx())
                        .meetingAmount(session.getAmount())
                        .meetingAttendees(sessionAttendees.stream().map(this::toMeetingAttendeeDTO).collect(Collectors.toList()))
                        .build();
            }).collect(Collectors.toList());
        } else {
            meetingSessionDTOs = Collections.emptyList();
        }

        return ReceiptTripMeetingResponseDTO.builder()
                .receiptTripMeetingIdx(entity.getIdx())
                .documentIdx(entity.getDocumentIdx())
                .documentNumber(entity.getDocumentNumber())
                .projectIdx(entity.getProjectIdx())
                .cardIdx(entity.getCardIdx())
                .drafterUserIdx(entity.getDrafterUserIdx())
                .deleted(entity.getDeleted())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .tripDate(entity.getTripDate())
                .requisitionDate(entity.getRequisitionDate())
                .duration(entity.getDuration())
                .location(entity.getLocation())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .totalFee(entity.getTotalFee())
                // 단일 회의 필드 (backward compat, meetingSessions[0]과 동일)
                .eventDate(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getMeetingDate())
                .startTime(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getStartTime())
                .endTime(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getEndTime())
                .meetingPurpose(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getMeetingPurpose())
                .minutesNotes(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getMeetingContent())
                .meetingDrafterUserIdx(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getMeetingDrafterUserIdx())
                .meetingAmount(meetingSessionDTOs.isEmpty() ? null : meetingSessionDTOs.get(0).getMeetingAmount())
                .meetingAttendees(meetingSessionDTOs.isEmpty() ? Collections.emptyList() : meetingSessionDTOs.get(0).getMeetingAttendees())
                .dailyExpenses(expenses.stream().map(this::toExpenseDTO).collect(Collectors.toList()))
                .tripAttendees(tripAttendeesRaw.stream().map(this::toTripAttendeeDTO).collect(Collectors.toList()))
                .attachments(attachments.stream().map(this::toAttachmentDTO).collect(Collectors.toList()))
                .meetingSessions(meetingSessionDTOs)
                .build();
    }

    /** 목록 조회용 경량 DTO */
    private ReceiptTripMeetingResponseDTO toSimpleDTO(ReceiptTripMeeting entity) {
        return ReceiptTripMeetingResponseDTO.builder()
                .receiptTripMeetingIdx(entity.getIdx())
                .documentIdx(entity.getDocumentIdx())
                .documentNumber(entity.getDocumentNumber())
                .projectIdx(entity.getProjectIdx())
                .cardIdx(entity.getCardIdx())
                .drafterUserIdx(entity.getDrafterUserIdx())
                .deleted(entity.getDeleted())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .tripDate(entity.getTripDate())
                .requisitionDate(entity.getRequisitionDate())
                .duration(entity.getDuration())
                .location(entity.getLocation())
                .totalFee(entity.getTotalFee())
                .build();
    }

    private ReceiptTripMeetingDailyExpenseDTO toExpenseDTO(ReceiptTripMeetingDailyExpense e) {
        return ReceiptTripMeetingDailyExpenseDTO.builder()
                .expenseDate(e.getExpenseDate())
                .transportationFee(e.getTransportationFee())
                .accommodationFee(e.getAccommodationFee())
                .mealFee(e.getMealFee())
                .otherFee(e.getOtherFee())
                .build();
    }

    private ReceiptTripAttendeeDTO toTripAttendeeDTO(ReceiptAttendee attendee) {
        ReceiptTripAttendeeDTO dto = ReceiptTripAttendeeDTO.builder()
                .idx(attendee.getIdx())
                .userIdx(attendee.getUserIdx())
                .displayOrder(attendee.getDisplayOrder())
                .build();
        if (attendee.getUserIdx() != null) {
            userRepository.findById(attendee.getUserIdx()).ifPresent(user -> {
                dto.setName(user.getEmpName());
                log.debug("[DEBUG] toTripAttendeeDTO - userIdx:{}, empName:{}", attendee.getUserIdx(), user.getEmpName());
            });
        }
        return dto;
    }

    private ReceiptMeetingAttendeeDTO toMeetingAttendeeDTO(ReceiptAttendee attendee) {
        ReceiptMeetingAttendeeDTO dto = ReceiptMeetingAttendeeDTO.builder()
                .idx(attendee.getIdx())
                .userIdx(attendee.getUserIdx())
                .isExternal(attendee.getIsExternal())
                .displayOrder(attendee.getDisplayOrder())
                .build();
        if (attendee.getUserIdx() != null && !Boolean.TRUE.equals(attendee.getIsExternal())) {
            userRepository.findById(attendee.getUserIdx()).ifPresent(user -> dto.setName(user.getEmpName()));
        }
        return dto;
    }

    private ReceiptTripMeetingAttachmentDTO toAttachmentDTO(ReceiptTripMeetingAttachment a) {
        return ReceiptTripMeetingAttachmentDTO.builder()
                .idx(a.getIdx())
                .receiptTripMeetingIdx(a.getReceiptTripMeetingIdx())
                .originalFilename(a.getOriginalFilename())
                .storedFilename(a.getStoredFilename())
                .filePath(a.getFilePath())
                .fileSize(a.getFileSize())
                .fileType(a.getFileType())
                .attachmentType(a.getAttachmentType())
                .sessionIdx(a.getSessionIdx())
                .uploadUserIdx(a.getUploadUserIdx())
                .deleted(a.getDeleted())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    /** 수정 시 첨부파일 원본 파일명 재정렬 */
    private void renameAttachments(ReceiptTripMeeting rtm) {
        List<ReceiptTripMeetingAttachment> all = attachmentRepository
                .findByReceiptTripMeetingIdxOrderByIdxAsc(rtm.getIdx());

        String cardLastDigits = "no-card";
        if (rtm.getCardIdx() != null) {
            var card = projectCardRepository.findById(rtm.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }
        String displayDateStr   = rtm.getTripDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        BigDecimal totalAmount  = calcTotal(rtm);
        String displayAmountStr = String.format("%,d원", totalAmount.longValue());
        final String finalCardLastDigits = cardLastDigits;

        Map<String, List<ReceiptTripMeetingAttachment>> byType = all.stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .collect(Collectors.groupingBy(
                        a -> a.getAttachmentType() != null ? a.getAttachmentType() : "RECEIPT",
                        Collectors.toList()));

        byType.forEach((type, list) -> {
            String displayDocType;
            switch (type) {
                case "MEETING_RECEIPT":  displayDocType = "회의_영수증";  break;
                case "MEETING_DOCUMENT": displayDocType = "회의_공식문서"; break;
                case "TRIP_RECEIPT":     displayDocType = "출장_영수증";  break;
                case "TRIP_DOCUMENT":    displayDocType = "출장_공식문서"; break;
                default:                 displayDocType = "영수증";       break;
            }
            String baseName = finalCardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_회의출장_" + displayDocType;
            list.sort(Comparator.comparing(ReceiptTripMeetingAttachment::getIdx));
            for (int i = 0; i < list.size(); i++) {
                ReceiptTripMeetingAttachment att = list.get(i);
                String storedName = att.getStoredFilename();
                String extension = "";
                if (storedName != null) {
                    int dot = storedName.lastIndexOf('.');
                    if (dot > 0) extension = storedName.substring(dot);
                }
                att.setOriginalFilename(baseName + "_" + (i + 1) + extension);
                attachmentRepository.save(att);
            }
        });
    }
}
