package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.project.repository.*;
import com.pinecni.erp.api.user.repository.UserRepository;
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
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 연구비증빙 회의+출장 통합 Service 구현체
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
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final ProjectCardRepository projectCardRepository;
    private final UserRepository userRepository;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-trip-meeting.pattern}")
    private String uploadPattern;

    private static final String DOCUMENT_TYPE = "receipt_trip_meeting";
    private static final String PREFIX        = "RCTM";

    @Override
    @Transactional
    public ReceiptTripMeetingResponseDTO createReceiptTripMeeting(
            ReceiptTripMeetingCreateDTO dto,
            MultipartFile[] receiptFiles,
            MultipartFile[] documentFiles,
            Long currentUserIdx) {

        log.debug("회의+출장 통합 저장 - projectIdx: {}, drafterUserIdx: {}", dto.getProjectIdx(), dto.getDrafterUserIdx());

        // ── 1. 문서 번호 생성 ──────────────────────────────────────────
        String documentNo = documentSequenceService.generateDocumentNumber(DOCUMENT_TYPE, PREFIX, currentUserIdx);

        // ── 2. ApprovalDocument 생성 ──────────────────────────────────
        //      drafterUserIdx = 문서상 작성자 (화면에서 선택)
        //      createdUserIdx = 실제 로그인한 저장자 (currentUserIdx)
        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(buildTitle(dto))
                .documentType("연구비증빙-회의+출장")
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
                .duration(dto.getDuration() != null ? dto.getDuration() : 0)
                .location(dto.getLocation())
                .totalFee(totalFee)
                .purpose(dto.getPurpose())
                .content(dto.getTripContent())
                // 회의
                .eventDate(dto.getMeetingDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .minutesNotes(dto.getMeetingContent())
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

        // ── 6. 파일 첨부 저장 ─────────────────────────────────────────
        saveAttachments(entity, receiptFiles,  "RECEIPT",  currentUserIdx);
        saveAttachments(entity, documentFiles, "DOCUMENT", currentUserIdx);

        // ── 7. 출장 참석자 저장 (receipt_attendee, prefix=RCTM, participation_type='출장') ─
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

        // ── 8. 회의 참석자 저장 (receipt_attendee, prefix=RCTM, participation_type='회의') ─
        if (dto.getMeetingAttendees() != null && !dto.getMeetingAttendees().isEmpty()) {
            // 회의 참석자 시간 중복 검증
            validateMeetingAttendeeDuplicates(
                    dto.getMeetingDate(), dto.getStartTime(), dto.getEndTime(),
                    dto.getProjectIdx(), dto.getMeetingAttendees(), null);

            List<ReceiptAttendee> meetingAttendees = dto.getMeetingAttendees().stream()
                    .map(a -> ReceiptAttendee.builder()
                            .documentTypePrefix("RCTM")
                            .receiptIdx(rtmIdx)
                            .projectIdx(dto.getProjectIdx())
                            .cardIdx(dto.getCardIdx())
                            .documentDate(dto.getMeetingDate())
                            .startTime(dto.getStartTime())
                            .endTime(dto.getEndTime())
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
            receiptAttendeeRepository.saveAll(meetingAttendees);
            log.debug("회의 참석자 {}명 저장 완료", meetingAttendees.size());
        }

        log.info("회의+출장 통합 저장 완료 - rtmIdx: {}, documentNo: {}", rtmIdx, documentNo);

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
        log.debug("회의+출장 상세 조회 - idx: {}", idx);
        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의+출장 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 회의+출장입니다. idx: " + idx);
        }
        return toDetailDTO(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 회의+출장 목록 조회 - projectIdx: {}", projectIdx);
        return receiptTripMeetingRepository.findByProjectIdxOrderByTripDateDesc(projectIdx)
                .stream()
                .filter(e -> !Boolean.TRUE.equals(e.getDeleted()))
                .map(this::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingsByDrafterUserIdx(Long drafterUserIdx) {
        log.debug("작성자별 회의+출장 목록 조회 - drafterUserIdx: {}", drafterUserIdx);
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
            MultipartFile[] receiptFiles,
            MultipartFile[] documentFiles,
            Long currentUserIdx) {

        log.debug("회의+출장 수정 - idx: {}, currentUserIdx: {}", idx, currentUserIdx);

        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의+출장 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 회의+출장입니다. idx: " + idx);
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
        entity.setTripDate(updateDTO.getTripDate());
        entity.setDuration(updateDTO.getDuration() != null ? updateDTO.getDuration() : 0);
        entity.setLocation(updateDTO.getLocation());
        entity.setPurpose(updateDTO.getPurpose());
        entity.setContent(updateDTO.getTripContent());
        entity.setTotalFee(totalFee);
        entity.setEventDate(updateDTO.getMeetingDate());
        entity.setStartTime(updateDTO.getStartTime());
        entity.setEndTime(updateDTO.getEndTime());
        entity.setMinutesNotes(updateDTO.getMeetingContent());
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

        if (updateDTO.getMeetingAttendees() != null && !updateDTO.getMeetingAttendees().isEmpty()) {
            validateMeetingAttendeeDuplicates(
                    updateDTO.getMeetingDate(), updateDTO.getStartTime(), updateDTO.getEndTime(),
                    updateDTO.getProjectIdx(), updateDTO.getMeetingAttendees(), idx);

            List<ReceiptAttendee> meetingAttendees = updateDTO.getMeetingAttendees().stream()
                    .map(a -> ReceiptAttendee.builder()
                            .documentTypePrefix("RCTM")
                            .receiptIdx(rtmIdx)
                            .projectIdx(updateDTO.getProjectIdx())
                            .cardIdx(updateDTO.getCardIdx())
                            .documentDate(updateDTO.getMeetingDate())
                            .startTime(updateDTO.getStartTime())
                            .endTime(updateDTO.getEndTime())
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
            receiptAttendeeRepository.saveAll(meetingAttendees);
        }

        // 5. 새 첨부파일 저장 + 기존 첨부파일 표시명 재정렬
        saveAttachments(entity, receiptFiles,  "RECEIPT",  currentUserIdx);
        saveAttachments(entity, documentFiles, "DOCUMENT", currentUserIdx);
        renameAttachments(entity);

        // 6. ApprovalDocument 제목 업데이트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(doc -> {
                doc.setTitle(buildTitle(updateDTO));
                doc.setContent(updateDTO.getTripContent());
                doc.setUpdatedUserIdx(currentUserIdx);
                approvalDocumentRepository.save(doc);
            });
        }

        log.info("회의+출장 수정 완료 - idx: {}", idx);
        return toDetailDTO(entity);
    }

    // ══════════════════════════════════════════════════════════════
    // 삭제
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public void deleteReceiptTripMeeting(Long idx, Long deletedUserIdx) {
        log.debug("회의+출장 소프트 딜리트 - idx: {}", idx);

        ReceiptTripMeeting entity = receiptTripMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의+출장 정보를 찾을 수 없습니다. idx: " + idx));

        LocalDateTime now = LocalDateTime.now();

        // 1. 참석자 소프트 딜리트
        receiptAttendeeRepository.softDeleteByReceiptTripMeetingIdx(idx, deletedUserIdx);
        log.debug("ReceiptAttendee 소프트 딜리트 완료 - rtmIdx: {}", idx);

        // 2. 첨부파일 소프트 딜리트
        attachmentRepository.softDeleteByReceiptTripMeetingIdx(idx, deletedUserIdx);
        log.debug("ReceiptTripMeetingAttachment 소프트 딜리트 완료 - rtmIdx: {}", idx);

        // 3. ApprovalDocument 소프트 딜리트
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

        log.info("회의+출장 소프트 딜리트 완료 - idx: {}", idx);
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

    // ══════════════════════════════════════════════════════════════
    // 파일 저장
    // ══════════════════════════════════════════════════════════════

    private void saveAttachments(ReceiptTripMeeting rtm, MultipartFile[] files,
                                 String attachmentType, Long uploadUserIdx) {
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
        String displayDocType   = "DOCUMENT".equals(attachmentType) ? "공식문서" : "영수증";
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
        StringBuilder sb = new StringBuilder("연구비증빙 회의+출장");
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

        log.debug("RCTM 회의 참석자 중복 검증 - 날짜: {}, 시간: {} ~ {}, 프로젝트: {}, 참석자 수: {}",
                meetingDate, startTime, endTime, projectIdx, attendees.size());

        for (ReceiptMeetingAttendeeDTO attendee : attendees) {
            if (attendee.getUserIdx() == null) continue;
            // 외부 참석자는 시간 중복 검증 제외
            if (Boolean.TRUE.equals(attendee.getIsExternal())) continue;

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
                    .collect(Collectors.toList());

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

    // ══════════════════════════════════════════════════════════════
    // DTO 변환 헬퍼
    // ══════════════════════════════════════════════════════════════

    /** 상세 조회용 DTO (참석자, 첨부파일, 일별비용 포함) */
    private ReceiptTripMeetingResponseDTO toDetailDTO(ReceiptTripMeeting entity) {
        List<ReceiptTripMeetingDailyExpense> expenses = dailyExpenseRepository
                .findByReceiptTripMeetingIdxOrderByExpenseDateAsc(entity.getIdx());
        List<ReceiptAttendee> tripAttendeesRaw = receiptAttendeeRepository
                .findByReceiptTripMeetingIdxAndParticipationType(entity.getIdx(), "출장");
        List<ReceiptAttendee> meetingAttendeesRaw = receiptAttendeeRepository
                .findByReceiptTripMeetingIdxAndParticipationType(entity.getIdx(), "회의");
        List<ReceiptTripMeetingAttachment> attachments = attachmentRepository
                .findByReceiptTripMeetingIdxAndDeletedFalseOrderByIdxAsc(entity.getIdx());

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
                .duration(entity.getDuration())
                .location(entity.getLocation())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .totalFee(entity.getTotalFee())
                .eventDate(entity.getEventDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .minutesNotes(entity.getMinutesNotes())
                .dailyExpenses(expenses.stream().map(this::toExpenseDTO).collect(Collectors.toList()))
                .tripAttendees(tripAttendeesRaw.stream().map(this::toTripAttendeeDTO).collect(Collectors.toList()))
                .meetingAttendees(meetingAttendeesRaw.stream().map(this::toMeetingAttendeeDTO).collect(Collectors.toList()))
                .attachments(attachments.stream().map(this::toAttachmentDTO).collect(Collectors.toList()))
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
                .duration(entity.getDuration())
                .location(entity.getLocation())
                .totalFee(entity.getTotalFee())
                .eventDate(entity.getEventDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
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
            userRepository.findById(attendee.getUserIdx()).ifPresent(user -> dto.setName(user.getEmpName()));
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
            String displayDocType = "DOCUMENT".equals(type) ? "공식문서" : "영수증";
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
