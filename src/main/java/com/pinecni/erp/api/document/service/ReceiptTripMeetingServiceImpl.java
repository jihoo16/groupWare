package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.project.repository.*;
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
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
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
    private final ReceiptTripMeetingAttendeeRepository attendeeRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final ProjectCardRepository projectCardRepository;

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

        // ── 7. 출장 참석자 저장 (participation_type='출장', attendee_type='내부') ─
        if (dto.getTripAttendees() != null && !dto.getTripAttendees().isEmpty()) {
            List<ReceiptTripMeetingAttendee> tripAttendees = dto.getTripAttendees().stream()
                    .map(a -> ReceiptTripMeetingAttendee.builder()
                            .receiptTripMeetingIdx(rtmIdx)
                            .participationType("출장")
                            .attendeeType("내부")
                            .userIdx(a.getUserIdx())
                            .department(a.getDepartment())
                            .name(a.getName())
                            .displayOrder(a.getDisplayOrder() != null ? a.getDisplayOrder() : 0)
                            .createdUserIdx(currentUserIdx)
                            .isDeleted(false)
                            .build())
                    .collect(Collectors.toList());
            attendeeRepository.saveAll(tripAttendees);
            log.debug("출장 참석자 {}명 저장 완료", tripAttendees.size());
        }

        // ── 8. 회의 참석자 저장 (participation_type='회의') ──────────────
        if (dto.getMeetingAttendees() != null && !dto.getMeetingAttendees().isEmpty()) {
            List<ReceiptTripMeetingAttendee> meetingAttendees = dto.getMeetingAttendees().stream()
                    .map(a -> ReceiptTripMeetingAttendee.builder()
                            .receiptTripMeetingIdx(rtmIdx)
                            .participationType("회의")
                            .attendeeType(Boolean.TRUE.equals(a.getIsExternal()) ? "외부" : "내부")
                            .userIdx(a.getUserIdx())
                            .department(a.getDepartment())
                            .name(a.getName())
                            .displayOrder(a.getDisplayOrder() != null ? a.getDisplayOrder() : 0)
                            .createdUserIdx(currentUserIdx)
                            .isDeleted(false)
                            .build())
                    .collect(Collectors.toList());
            attendeeRepository.saveAll(meetingAttendees);
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
}
