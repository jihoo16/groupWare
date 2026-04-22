package com.pinecni.erp.api.approval.service;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;
import com.pinecni.erp.api.approval.dto.AttachmentSummaryDTO;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeAttachmentRepository;
import com.pinecni.erp.api.document.repository.ReceiptTripAttachmentRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingAttachmentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.document.repository.MeetingMinutesRepository;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseItemRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingAttachmentRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingSessionRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import com.pinecni.erp.api.document.repository.ExpenseRequisitionRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseAttachmentRepository;
import com.pinecni.erp.api.expense.repository.ExpenseApprovalRepository;
import com.pinecni.erp.api.vacation.repository.VacationRequestRepository;
import com.pinecni.erp.api.signature.repository.DocumentSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 전자 문서 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalDocumentServiceImpl implements ApprovalDocumentService {

    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final WeeklyReportRepository weeklyReportRepository;
    private final MeetingMinutesRepository meetingMinutesRepository;
    private final ReceiptTripRepository receiptTripRepository;
    private final ReceiptMeetingRepository receiptMeetingRepository;
    private final ReceiptTripMeetingRepository receiptTripMeetingRepository;
    private final ReceiptOvertimeRepository receiptOvertimeRepository;
    private final ReceiptPurchaseRepository receiptPurchaseRepository;
    private final ReceiptPurchaseItemRepository receiptPurchaseItemRepository;
    private final ProjectCardRepository projectCardRepository;
    private final ProjectRepository projectRepository;
    private final ReceiptMeetingAttachmentRepository receiptMeetingAttachmentRepository;
    private final ReceiptOvertimeAttachmentRepository receiptOvertimeAttachmentRepository;
    private final ReceiptTripAttachmentRepository receiptTripAttachmentRepository;
    private final ReceiptTripMeetingSessionRepository receiptTripMeetingSessionRepository;
    private final ReceiptTripMeetingAttachmentRepository receiptTripMeetingAttachmentRepository;
    private final ExpenseApprovalRepository expenseApprovalRepository;
    private final ExpenseRequisitionRepository expenseRequisitionRepository;
    private final VacationRequestRepository vacationRequestRepository;
    private final ReceiptAttendeeRepository receiptAttendeeRepository;
    private final ReceiptPurchaseAttachmentRepository receiptPurchaseAttachmentRepository;
    private final DocumentSignatureRepository documentSignatureRepository;

    @Override
    public List<ApprovalDocumentDTO> getAllDocuments(Long currentUserIdx) {
        log.debug("[일반 전자결재 문서 조회] 시작 - 현재 사용자: {}", currentUserIdx);

        // is_project = false인 일반 전자결재 문서만 조회
        List<ApprovalDocument> documents = approvalDocumentRepository.findGeneralDocuments();

        // 배치 로딩: 사용자/부서코드 N+1 쿼리 방지
        Map<Long, User> userMap = batchLoadUsers(documents.stream()
                .map(ApprovalDocument::getCreatedUserIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));
        Map<String, String> deptCodeNameMap = loadDeptCodeNameMap();

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(doc -> convertToDTO(doc, userMap, deptCodeNameMap))
                .filter(dto -> {
                    // 원본 문서가 존재하는 것만 포함 (sourceDocumentId가 null이 아닌 경우)
                    // 원본 문서가 삭제된 경우를 필터링
                    if (CodeConstants.DocumentType.WEEKLY_REPORT.getCode().equals(dto.getDocumentType()) || CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(dto.getDocumentType())) {
                        return dto.getSourceDocumentId() != null;
                    }
                    // 연차신청서는 본인이 작성한 것만 포함
                    if (CodeConstants.DocumentType.VACATION.getCode().equals(dto.getDocumentType())) {
                        return dto.getDrafterUserIdx().equals(currentUserIdx);
                    }
                    // 일반 전자결재 문서는 본인이 작성한 것만 포함 (민감한 재무 정보)
                    return dto.getDrafterUserIdx() != null && dto.getDrafterUserIdx().equals(currentUserIdx);
                })
                .collect(Collectors.toList());

        log.debug("[일반 전자결재 문서 조회] 완료 - 총 {}건 (현재 사용자: {})", result.size(), currentUserIdx);
        return result;
    }

    /**
     * 프로젝트 문서 전체 조회 (is_project = true) — 배치 로딩으로 N+1 최적화
     */
    public List<ApprovalDocumentDTO> getAllProjectDocuments() {
        log.debug("[프로젝트 문서 전체 조회] 시작");

        List<ApprovalDocument> documents = approvalDocumentRepository.findProjectDocuments();
        if (documents.isEmpty()) {
            log.debug("[프로젝트 문서 전체 조회] 완료 - 총 0건");
            return Collections.emptyList();
        }

        ProjectBatchContext ctx = buildProjectBatchContext(documents);

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(doc -> convertProjectDocumentToDTO(doc, ctx))
                .filter(dto -> dto.getSourceDocumentId() != null)
                .collect(Collectors.toList());

        log.debug("[프로젝트 문서 전체 조회] 완료 - 총 {}건", result.size());
        return result;
    }

    private ProjectBatchContext buildProjectBatchContext(List<ApprovalDocument> documents) {
        Map<Long, User> userMap = batchLoadUsers(documents.stream()
                .map(ApprovalDocument::getCreatedUserIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet()));
        Map<String, String> deptCodeNameMap = loadDeptCodeNameMap();

        // 타입별 documentIdx 분류
        Map<String, List<Long>> byType = documents.stream()
                .collect(Collectors.groupingBy(ApprovalDocument::getDocumentType,
                        Collectors.mapping(ApprovalDocument::getIdx, Collectors.toList())));

        // 주간보고
        List<Long> weeklyDocIdxs = new ArrayList<>();
        weeklyDocIdxs.addAll(byType.getOrDefault(CodeConstants.DocumentType.WEEKLY_REPORT.getCode(), List.of()));
        weeklyDocIdxs.addAll(byType.getOrDefault(CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode(), List.of()));
        Map<Long, WeeklyReport> weeklyReportMap = weeklyDocIdxs.isEmpty() ? Collections.emptyMap() :
                weeklyReportRepository.findByDocumentIdxIn(weeklyDocIdxs).stream()
                        .collect(Collectors.toMap(WeeklyReport::getDocumentIdx, r -> r));

        // 회의록
        List<Long> meetingDocIdxs = byType.getOrDefault(CodeConstants.DocumentType.RECEIPT_MEETING.getCode(), List.of());
        Map<Long, ReceiptMeeting> receiptMeetingMap = meetingDocIdxs.isEmpty() ? Collections.emptyMap() :
                receiptMeetingRepository.findByDocumentIdxIn(meetingDocIdxs).stream()
                        .collect(Collectors.toMap(ReceiptMeeting::getDocumentIdx, r -> r));

        // 단독출장
        List<Long> tripDocIdxs = byType.getOrDefault(CodeConstants.DocumentType.RECEIPT_TRIP.getCode(), List.of());
        Map<Long, ReceiptTrip> receiptTripMap = tripDocIdxs.isEmpty() ? Collections.emptyMap() :
                receiptTripRepository.findByDocumentIdxIn(tripDocIdxs).stream()
                        .collect(Collectors.toMap(ReceiptTrip::getDocumentIdx, r -> r));

        // 출장+회의
        List<Long> rtmDocIdxs = byType.getOrDefault(CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode(), List.of());
        Map<Long, ReceiptTripMeeting> receiptTripMeetingMap = rtmDocIdxs.isEmpty() ? Collections.emptyMap() :
                receiptTripMeetingRepository.findByDocumentIdxIn(rtmDocIdxs).stream()
                        .collect(Collectors.toMap(ReceiptTripMeeting::getDocumentIdx, r -> r));

        // 야근식대
        List<Long> overtimeDocIdxs = byType.getOrDefault(CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode(), List.of());
        Map<Long, ReceiptOvertime> receiptOvertimeMap = overtimeDocIdxs.isEmpty() ? Collections.emptyMap() :
                receiptOvertimeRepository.findByDocumentIdxIn(overtimeDocIdxs).stream()
                        .collect(Collectors.toMap(ReceiptOvertime::getDocumentIdx, r -> r));

        // 재료비/장비비
        List<Long> purchaseDocIdxs = new ArrayList<>();
        purchaseDocIdxs.addAll(byType.getOrDefault(CodeConstants.DocumentType.RECEIPT_MATERIAL.getCode(), List.of()));
        purchaseDocIdxs.addAll(byType.getOrDefault(CodeConstants.DocumentType.RECEIPT_EQUIPMENT.getCode(), List.of()));
        Map<Long, ReceiptPurchase> receiptPurchaseMap = purchaseDocIdxs.isEmpty() ? Collections.emptyMap() :
                receiptPurchaseRepository.findByDocumentIdxIn(purchaseDocIdxs).stream()
                        .collect(Collectors.toMap(ReceiptPurchase::getDocumentIdx, r -> r));

        // 프로젝트 배치 로딩
        Set<Long> projectIdxs = new HashSet<>();
        weeklyReportMap.values().forEach(r -> { if (r.getProjectIdx() != null) projectIdxs.add(r.getProjectIdx()); });
        receiptMeetingMap.values().forEach(r -> { if (r.getProjectIdx() != null) projectIdxs.add(r.getProjectIdx()); });
        receiptTripMap.values().forEach(r -> { if (r.getProjectIdx() != null) projectIdxs.add(r.getProjectIdx()); });
        receiptTripMeetingMap.values().forEach(r -> { if (r.getProjectIdx() != null) projectIdxs.add(r.getProjectIdx()); });
        receiptOvertimeMap.values().forEach(r -> { if (r.getProjectIdx() != null) projectIdxs.add(r.getProjectIdx()); });
        receiptPurchaseMap.values().forEach(r -> { if (r.getProjectIdx() != null) projectIdxs.add(r.getProjectIdx()); });
        Map<Long, Project> projectMap = projectIdxs.isEmpty() ? Collections.emptyMap() :
                projectRepository.findAllById(projectIdxs).stream()
                        .collect(Collectors.toMap(Project::getIdx, p -> p));

        // 카드 배치 로딩
        Set<Long> cardIdxs = new HashSet<>();
        receiptMeetingMap.values().forEach(r -> { if (r.getCardIdx() != null) cardIdxs.add(r.getCardIdx()); });
        receiptTripMap.values().forEach(r -> { if (r.getCardIdx() != null) cardIdxs.add(r.getCardIdx()); });
        receiptTripMeetingMap.values().forEach(r -> { if (r.getCardIdx() != null) cardIdxs.add(r.getCardIdx()); });
        receiptOvertimeMap.values().forEach(r -> { if (r.getCardIdx() != null) cardIdxs.add(r.getCardIdx()); });
        receiptPurchaseMap.values().forEach(r -> { if (r.getCardIdx() != null) cardIdxs.add(r.getCardIdx()); });
        Map<Long, ProjectCard> cardMap = cardIdxs.isEmpty() ? Collections.emptyMap() :
                projectCardRepository.findAllById(cardIdxs).stream()
                        .collect(Collectors.toMap(ProjectCard::getIdx, c -> c));

        // 참석자 배치 로딩
        List<Long> meetingIdxs = receiptMeetingMap.values().stream().map(ReceiptMeeting::getIdx).collect(Collectors.toList());
        List<Long> tripIdxs = receiptTripMap.values().stream().map(ReceiptTrip::getIdx).collect(Collectors.toList());
        List<Long> overtimeIdxs = receiptOvertimeMap.values().stream().map(ReceiptOvertime::getIdx).collect(Collectors.toList());
        List<Long> rtmIdxs = receiptTripMeetingMap.values().stream().map(ReceiptTripMeeting::getIdx).collect(Collectors.toList());

        Map<Long, String> meetingParticipantNames = buildBatchParticipantNamesMap(meetingIdxs, "RCM");
        Map<Long, String> tripParticipantNames = buildBatchParticipantNamesMap(tripIdxs, "RCT");
        Map<Long, String> overtimeParticipantNames = buildBatchParticipantNamesMap(overtimeIdxs, "RCO");
        Map<Long, String> rctmParticipantNames = buildBatchParticipantNamesMap(rtmIdxs, "RCTM");

        // 첨부파일 배치 로딩
        Map<Long, List<AttachmentSummaryDTO>> meetingAttachmentMap = buildBatchMeetingAttachmentsMap(meetingIdxs);
        Map<Long, List<AttachmentSummaryDTO>> tripAttachmentMap = buildBatchTripAttachmentsMap(tripIdxs);
        Map<Long, List<AttachmentSummaryDTO>> overtimeAttachmentMap = buildBatchOvertimeAttachmentsMap(overtimeIdxs);
        Map<Long, List<AttachmentSummaryDTO>> rctmAttachmentMap = buildBatchRctmAttachmentsMap(rtmIdxs);
        List<Long> purchaseIdxs = receiptPurchaseMap.values().stream().map(ReceiptPurchase::getIdx).collect(Collectors.toList());
        Map<Long, List<AttachmentSummaryDTO>> purchaseAttachmentMap = buildBatchPurchaseAttachmentsMap(purchaseIdxs);

        // 재료비/장비비 카드사용일자 배치 계산
        Map<Long, LocalDate> purchaseCardUsageDateMap = buildBatchPurchaseCardUsageDateMap(purchaseIdxs);

        return new ProjectBatchContext(userMap, deptCodeNameMap,
                weeklyReportMap, receiptMeetingMap, receiptTripMap, receiptTripMeetingMap, receiptOvertimeMap, receiptPurchaseMap,
                projectMap, cardMap,
                meetingParticipantNames, tripParticipantNames, overtimeParticipantNames, rctmParticipantNames,
                meetingAttachmentMap, tripAttachmentMap, overtimeAttachmentMap, rctmAttachmentMap, purchaseAttachmentMap,
                purchaseCardUsageDateMap);
    }

    private ApprovalDocumentDTO convertProjectDocumentToDTO(ApprovalDocument document, ProjectBatchContext ctx) {
        String docTypeCode = document.getDocumentType();
        CodeConstants.DocumentType docTypeEnum = CodeConstants.DocumentType.fromCodeOrNull(docTypeCode);
        String docTypeName = docTypeEnum != null ? docTypeEnum.getName() : docTypeCode;

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(document.getIdx())
                .documentNo(document.getDocumentNo())
                .title(document.getTitle())
                .documentType(docTypeCode)
                .documentTypeName(docTypeName)
                .drafterUserIdx(document.getDrafterUserIdx())
                .content(document.getContent())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();

        if (document.getCreatedUserIdx() != null) {
            User user = ctx.userMap().get(document.getCreatedUserIdx());
            if (user != null) {
                dto.setDrafterName(user.getEmpName());
                dto.setDrafterDept(user.getEmpDept());
                if (user.getEmpDept() != null) {
                    dto.setDrafterDeptName(ctx.deptCodeNameMap().get(user.getEmpDept()));
                }
            }
        }

        if (CodeConstants.DocumentType.WEEKLY_REPORT.getCode().equals(docTypeCode) ||
                CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(docTypeCode)) {
            WeeklyReport wr = ctx.weeklyReportMap().get(document.getIdx());
            if (wr != null) {
                dto.setSourceDocumentId(wr.getId());
                if (wr.getProjectIdx() != null) {
                    dto.setProjectIdx(wr.getProjectIdx());
                    Project project = ctx.projectMap().get(wr.getProjectIdx());
                    if (project != null) dto.setProjectName(project.getProjectName());
                }
            }
        } else if (CodeConstants.DocumentType.RECEIPT_MEETING.getCode().equals(docTypeCode)) {
            ReceiptMeeting rm = ctx.receiptMeetingMap().get(document.getIdx());
            if (rm != null) {
                dto.setSourceDocumentId(rm.getIdx());
                if (rm.getProjectIdx() != null) {
                    dto.setProjectIdx(rm.getProjectIdx());
                    Project project = ctx.projectMap().get(rm.getProjectIdx());
                    if (project != null) dto.setProjectName(project.getProjectName());
                }
                dto.setEventDate(rm.getMeetingDate());
                dto.setCardUsageDate(rm.getMeetingDate());
                enrichWithCardInfoFromMap(dto, rm.getCardIdx(), ctx.cardMap());
                dto.setPurpose(rm.getPurpose());
                dto.setAmount(rm.getAmount());
                dto.setParticipantNames(ctx.meetingParticipantNames().get(rm.getIdx()));
                dto.setAttachments(ctx.meetingAttachmentMap().getOrDefault(rm.getIdx(), Collections.emptyList()));
            }
        } else if (CodeConstants.DocumentType.RECEIPT_TRIP.getCode().equals(docTypeCode)) {
            ReceiptTrip rt = ctx.receiptTripMap().get(document.getIdx());
            if (rt != null) {
                dto.setSourceDocumentId(rt.getIdx());
                if (rt.getProjectIdx() != null) {
                    dto.setProjectIdx(rt.getProjectIdx());
                    Project project = ctx.projectMap().get(rt.getProjectIdx());
                    if (project != null) dto.setProjectName(project.getProjectName());
                }
                dto.setEventDate(rt.getTripDate());
                dto.setCardUsageDate(rt.getTripDate());
                enrichWithCardInfoFromMap(dto, rt.getCardIdx(), ctx.cardMap());
                dto.setLocation(rt.getLocation());
                dto.setAmount(rt.getTotalFee());
                dto.setParticipantNames(ctx.tripParticipantNames().get(rt.getIdx()));
                dto.setAttachments(ctx.tripAttachmentMap().getOrDefault(rt.getIdx(), Collections.emptyList()));
            }
        } else if (CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode().equals(docTypeCode)) {
            ReceiptTripMeeting rtm = ctx.receiptTripMeetingMap().get(document.getIdx());
            if (rtm != null) {
                dto.setSourceDocumentId(rtm.getIdx());
                if (rtm.getProjectIdx() != null) {
                    dto.setProjectIdx(rtm.getProjectIdx());
                    Project project = ctx.projectMap().get(rtm.getProjectIdx());
                    if (project != null) dto.setProjectName(project.getProjectName());
                }
                dto.setEventDate(rtm.getTripDate());
                dto.setCardUsageDate(rtm.getTripDate());
                enrichWithCardInfoFromMap(dto, rtm.getCardIdx(), ctx.cardMap());
                dto.setLocation(rtm.getLocation());
                dto.setPurpose(rtm.getPurpose());
                dto.setAmount(rtm.getTotalFee());
                dto.setParticipantNames(ctx.rctmParticipantNames().get(rtm.getIdx()));
                dto.setAttachments(ctx.rctmAttachmentMap().getOrDefault(rtm.getIdx(), Collections.emptyList()));
            }
        } else if (CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode().equals(docTypeCode)) {
            ReceiptOvertime ro = ctx.receiptOvertimeMap().get(document.getIdx());
            if (ro != null) {
                dto.setSourceDocumentId(ro.getIdx());
                if (ro.getProjectIdx() != null) {
                    dto.setProjectIdx(ro.getProjectIdx());
                    Project project = ctx.projectMap().get(ro.getProjectIdx());
                    if (project != null) dto.setProjectName(project.getProjectName());
                }
                dto.setEventDate(ro.getOvertimeDate());
                dto.setCardUsageDate(ro.getOvertimeDate());
                enrichWithCardInfoFromMap(dto, ro.getCardIdx(), ctx.cardMap());
                dto.setAmount(ro.getTotalAmount());
                dto.setParticipantNames(ctx.overtimeParticipantNames().get(ro.getIdx()));
                dto.setAttachments(ctx.overtimeAttachmentMap().getOrDefault(ro.getIdx(), Collections.emptyList()));
            }
        } else if (CodeConstants.DocumentType.RECEIPT_MATERIAL.getCode().equals(docTypeCode) ||
                   CodeConstants.DocumentType.RECEIPT_EQUIPMENT.getCode().equals(docTypeCode)) {
            ReceiptPurchase rp = ctx.receiptPurchaseMap().get(document.getIdx());
            if (rp != null) {
                dto.setSourceDocumentId(rp.getIdx());
                dto.setAmount(rp.getTotalAmount());
                String formattedAmount = rp.getTotalAmount() != null && rp.getTotalAmount().compareTo(BigDecimal.ZERO) != 0
                        ? String.format("%,d", rp.getTotalAmount().longValue()) + "원" : "0원";
                dto.setTitle(docTypeName + " - " + formattedAmount);
                if (rp.getProjectIdx() != null) {
                    dto.setProjectIdx(rp.getProjectIdx());
                    Project project = ctx.projectMap().get(rp.getProjectIdx());
                    if (project != null) dto.setProjectName(project.getProjectName());
                }
                if (rp.getApprovalDate() != null) {
                    dto.setEventDate(rp.getApprovalDate());
                }
                dto.setCardUsageDate(ctx.purchaseCardUsageDateMap().getOrDefault(rp.getIdx(), rp.getApprovalDate()));
                enrichWithCardInfoFromMap(dto, rp.getCardIdx(), ctx.cardMap());
                String purposeText = rp.getDocumentContent();
                if (purposeText == null || purposeText.isBlank()) {
                    purposeText = rp.getDocumentTitle();
                }
                dto.setPurpose(purposeText);
                dto.setPaymentType(rp.getPaymentType());
                dto.setAttachments(ctx.purchaseAttachmentMap().getOrDefault(rp.getIdx(), Collections.emptyList()));
            }
        }

        return dto;
    }

    private void enrichWithCardInfoFromMap(ApprovalDocumentDTO dto, Long cardIdx, Map<Long, ProjectCard> cardMap) {
        if (cardIdx == null) return;
        dto.setCardIdx(cardIdx);
        ProjectCard card = cardMap.get(cardIdx);
        if (card != null) {
            dto.setCardCompany(card.getCardCompany());
            dto.setCardLastDigits(card.getCardLastDigits());
            dto.setCardNickname(card.getCardNickname());
        }
    }

    private Map<Long, String> buildBatchParticipantNamesMap(List<Long> receiptIdxs, String prefix) {
        if (receiptIdxs.isEmpty()) return Collections.emptyMap();
        List<Object[]> rows = receiptAttendeeRepository.findAttendeesWithAllPersonInfoBatch(receiptIdxs, prefix);
        Map<Long, List<String>> namesByIdx = new HashMap<>();
        for (Object[] row : rows) {
            ReceiptAttendee attendee = (ReceiptAttendee) row[0];
            User user = (User) row[1];
            ExternalPerson ep = (ExternalPerson) row[2];
            String name;
            if (Boolean.TRUE.equals(attendee.getIsExternal()) && ep != null) {
                name = ep.getName();
            } else if (user != null) {
                name = user.getEmpName();
            } else {
                name = null;
            }
            if (name != null && !name.isBlank()) {
                namesByIdx.computeIfAbsent(attendee.getReceiptIdx(), k -> new ArrayList<>()).add(name);
            }
        }
        return namesByIdx.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> String.join(", ", e.getValue())));
    }

    private Map<Long, List<AttachmentSummaryDTO>> buildBatchMeetingAttachmentsMap(List<Long> meetingIdxs) {
        if (meetingIdxs.isEmpty()) return Collections.emptyMap();
        Map<Long, List<AttachmentSummaryDTO>> result = new HashMap<>();
        receiptMeetingAttachmentRepository.findByReceiptMeetingIdxIn(meetingIdxs).forEach(a ->
                result.computeIfAbsent(a.getReceiptMeetingIdx(), k -> new ArrayList<>()).add(
                        AttachmentSummaryDTO.builder()
                                .idx(a.getIdx())
                                .originalFilename(a.getOriginalFilename())
                                .attachmentType(a.getAttachmentType())
                                .downloadUrl("/api/receipt-meetings/attachments/" + a.getIdx() + "/download")
                                .build()));
        return result;
    }

    private Map<Long, List<AttachmentSummaryDTO>> buildBatchTripAttachmentsMap(List<Long> tripIdxs) {
        if (tripIdxs.isEmpty()) return Collections.emptyMap();
        Map<Long, List<AttachmentSummaryDTO>> result = new HashMap<>();
        receiptTripAttachmentRepository.findByReceiptTripIdxInAndDeletedFalseOrderByIdxAsc(tripIdxs).forEach(a ->
                result.computeIfAbsent(a.getReceiptTripIdx(), k -> new ArrayList<>()).add(
                        AttachmentSummaryDTO.builder()
                                .idx(a.getIdx())
                                .originalFilename(a.getOriginalFilename())
                                .attachmentType(a.getAttachmentType())
                                .downloadUrl("/api/receipt-trips/attachments/" + a.getIdx() + "/download")
                                .build()));
        return result;
    }

    private Map<Long, List<AttachmentSummaryDTO>> buildBatchOvertimeAttachmentsMap(List<Long> overtimeIdxs) {
        if (overtimeIdxs.isEmpty()) return Collections.emptyMap();
        Map<Long, List<AttachmentSummaryDTO>> result = new HashMap<>();
        receiptOvertimeAttachmentRepository.findByReceiptOvertimeIdxInAndDeletedFalseOrderByIdxAsc(overtimeIdxs).forEach(a ->
                result.computeIfAbsent(a.getReceiptOvertimeIdx(), k -> new ArrayList<>()).add(
                        AttachmentSummaryDTO.builder()
                                .idx(a.getIdx())
                                .originalFilename(a.getOriginalFilename())
                                .attachmentType(a.getAttachmentType())
                                .downloadUrl("/api/receipt-overtimes/attachments/" + a.getIdx() + "/download")
                                .build()));
        return result;
    }

    private Map<Long, List<AttachmentSummaryDTO>> buildBatchRctmAttachmentsMap(List<Long> rtmIdxs) {
        if (rtmIdxs.isEmpty()) return Collections.emptyMap();
        Map<Long, List<AttachmentSummaryDTO>> result = new HashMap<>();
        receiptTripMeetingAttachmentRepository.findByReceiptTripMeetingIdxInAndDeletedFalseOrderByIdxAsc(rtmIdxs).forEach(a ->
                result.computeIfAbsent(a.getReceiptTripMeetingIdx(), k -> new ArrayList<>()).add(
                        AttachmentSummaryDTO.builder()
                                .idx(a.getIdx())
                                .originalFilename(a.getOriginalFilename())
                                .attachmentType(a.getAttachmentType())
                                .sessionIdx(a.getSessionIdx())
                                .downloadUrl("/api/receipt-trip-meetings/attachments/" + a.getIdx() + "/download")
                                .build()));
        return result;
    }

    private Map<Long, List<AttachmentSummaryDTO>> buildBatchPurchaseAttachmentsMap(List<Long> purchaseIdxs) {
        if (purchaseIdxs.isEmpty()) return Collections.emptyMap();
        Map<Long, List<AttachmentSummaryDTO>> result = new HashMap<>();
        receiptPurchaseAttachmentRepository.findByReceiptPurchaseIdxInAndDeletedFalseOrderByIdxAsc(purchaseIdxs).forEach(a ->
                result.computeIfAbsent(a.getReceiptPurchaseIdx(), k -> new ArrayList<>()).add(
                        AttachmentSummaryDTO.builder()
                                .idx(a.getIdx())
                                .originalFilename(a.getOriginalFilename())
                                .attachmentType(a.getAttachmentType())
                                .downloadUrl("/api/receipt-purchases/attachments/" + a.getIdx() + "/download")
                                .build()));
        return result;
    }

    private Map<Long, LocalDate> buildBatchPurchaseCardUsageDateMap(List<Long> purchaseIdxs) {
        if (purchaseIdxs.isEmpty()) return Collections.emptyMap();
        Map<Long, LocalDate> result = new HashMap<>();
        receiptPurchaseItemRepository.findByReceiptPurchaseIdxIn(purchaseIdxs).stream()
                .filter(i -> i.getItemDate() != null)
                .collect(Collectors.groupingBy(ReceiptPurchaseItem::getReceiptPurchaseIdx,
                        Collectors.mapping(ReceiptPurchaseItem::getItemDate, Collectors.maxBy(LocalDate::compareTo))))
                .forEach((idx, maxDate) -> maxDate.ifPresent(d -> result.put(idx, d)));
        return result;
    }

    private record ProjectBatchContext(
            Map<Long, User> userMap,
            Map<String, String> deptCodeNameMap,
            Map<Long, WeeklyReport> weeklyReportMap,
            Map<Long, ReceiptMeeting> receiptMeetingMap,
            Map<Long, ReceiptTrip> receiptTripMap,
            Map<Long, ReceiptTripMeeting> receiptTripMeetingMap,
            Map<Long, ReceiptOvertime> receiptOvertimeMap,
            Map<Long, ReceiptPurchase> receiptPurchaseMap,
            Map<Long, Project> projectMap,
            Map<Long, ProjectCard> cardMap,
            Map<Long, String> meetingParticipantNames,
            Map<Long, String> tripParticipantNames,
            Map<Long, String> overtimeParticipantNames,
            Map<Long, String> rctmParticipantNames,
            Map<Long, List<AttachmentSummaryDTO>> meetingAttachmentMap,
            Map<Long, List<AttachmentSummaryDTO>> tripAttachmentMap,
            Map<Long, List<AttachmentSummaryDTO>> overtimeAttachmentMap,
            Map<Long, List<AttachmentSummaryDTO>> rctmAttachmentMap,
            Map<Long, List<AttachmentSummaryDTO>> purchaseAttachmentMap,
            Map<Long, LocalDate> purchaseCardUsageDateMap
    ) {}

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByType(String documentType) {
        log.debug("[문서 타입별 조회] documentType: {}", documentType);

        List<ApprovalDocument> documents = approvalDocumentRepository
                .findByDocumentTypeAndDeletedAtIsNullOrderByCreatedAtDesc(documentType);

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                .filter(dto -> {
                    // 원본 문서가 존재하는 것만 포함
                    if (CodeConstants.DocumentType.WEEKLY_REPORT.getCode().equals(dto.getDocumentType()) || CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(dto.getDocumentType())) {
                        return dto.getSourceDocumentId() != null;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        log.debug("[문서 타입별 조회] 완료 - 타입: {}, 총 {}건", documentType, result.size());
        return result;
    }

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByDrafter(Long drafterUserIdx) {
        log.debug("[작성자별 조회] drafterUserIdx: {}", drafterUserIdx);

        List<ApprovalDocument> documents = approvalDocumentRepository
                .findByDrafterUserIdxAndDeletedAtIsNullOrderByCreatedAtDesc(drafterUserIdx);

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                .filter(dto -> {
                    // 원본 문서가 존재하는 것만 포함
                    if (CodeConstants.DocumentType.WEEKLY_REPORT.getCode().equals(dto.getDocumentType()) || CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(dto.getDocumentType())) {
                        return dto.getSourceDocumentId() != null;
                    }
                    return true;
                })
                .collect(Collectors.toList());

        log.debug("[작성자별 조회] 완료 - userIdx: {}, 총 {}건", drafterUserIdx, result.size());
        return result;
    }

    /**
     * Entity → DTO 변환 (사용자 정보 포함)
     */
    private ApprovalDocumentDTO convertToDTO(ApprovalDocument document) {
        String docTypeCode = document.getDocumentType();
        CodeConstants.DocumentType docTypeEnum = CodeConstants.DocumentType.fromCodeOrNull(docTypeCode);
        String docTypeName = docTypeEnum != null ? docTypeEnum.getName() : docTypeCode;

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(document.getIdx())
                .documentNo(document.getDocumentNo())
                .title(document.getTitle())
                .documentType(docTypeCode)
                .documentTypeName(docTypeName)
                .drafterUserIdx(document.getDrafterUserIdx())
                .content(document.getContent())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();

        // 작성자 정보 조회 및 설정 (실제 문서 생성자)
        if (document.getCreatedUserIdx() != null) {
            userRepository.findById(document.getCreatedUserIdx()).ifPresent(user -> {
                dto.setDrafterName(user.getEmpName());
                dto.setDrafterDept(user.getEmpDept());

                // 부서명 조회
                if (user.getEmpDept() != null) {
                    codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                        dto.setDrafterDeptName(code.getCodeName());
                    });
                } else {
                    log.error("!!! 사용자의 부서코드가 null - userIdx: {}", user.getIdx());
                }
            });
        } else {
            log.error("!!! createdUserIdx가 null - 문서 IDX: {}", document.getIdx());
        }

        // 원본 문서 ID 조회 및 설정
        String documentType = document.getDocumentType();
        if (CodeConstants.DocumentType.WEEKLY_REPORT.getCode().equals(documentType) || CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(documentType)) {
            weeklyReportRepository.findByDocumentIdx(document.getIdx()).ifPresent(weeklyReport -> {
                dto.setSourceDocumentId(weeklyReport.getId());
                if (weeklyReport.getProjectIdx() != null) {
                    dto.setProjectIdx(weeklyReport.getProjectIdx());
                    projectRepository.findById(weeklyReport.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
            });
        } else if (CodeConstants.DocumentType.RECEIPT_MEETING.getCode().equals(documentType)) {
            // 연구비증빙 회의록의 원본 문서 ID 및 프로젝트 정보 조회
            receiptMeetingRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptMeeting -> {
                dto.setSourceDocumentId(receiptMeeting.getIdx());
                if (receiptMeeting.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptMeeting.getProjectIdx());
                    projectRepository.findById(receiptMeeting.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                dto.setEventDate(receiptMeeting.getMeetingDate());
                dto.setCardUsageDate(receiptMeeting.getMeetingDate());
                enrichWithCardInfo(dto, receiptMeeting.getCardIdx());
                dto.setPurpose(receiptMeeting.getPurpose());
                dto.setAmount(receiptMeeting.getAmount());
                dto.setParticipantNames(buildParticipantNames(receiptMeeting.getIdx(), "RCM"));
                dto.setAttachments(buildMeetingAttachments(receiptMeeting.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_TRIP.getCode().equals(documentType)) {
            // 연구비증빙 단독출장의 원본 문서 ID 및 프로젝트 정보 조회
            receiptTripRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptTrip -> {
                dto.setSourceDocumentId(receiptTrip.getIdx());
                if (receiptTrip.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptTrip.getProjectIdx());
                    projectRepository.findById(receiptTrip.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                dto.setEventDate(receiptTrip.getTripDate());
                dto.setCardUsageDate(receiptTrip.getTripDate());
                enrichWithCardInfo(dto, receiptTrip.getCardIdx());
                dto.setLocation(receiptTrip.getLocation());
                dto.setAmount(receiptTrip.getTotalFee());
                dto.setParticipantNames(buildParticipantNames(receiptTrip.getIdx(), "RCT"));
                dto.setAttachments(buildTripAttachments(receiptTrip.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode().equals(documentType)) {
            receiptTripMeetingRepository.findByDocumentIdx(document.getIdx()).ifPresent(rtm -> {
                dto.setSourceDocumentId(rtm.getIdx());
                if (rtm.getProjectIdx() != null) {
                    dto.setProjectIdx(rtm.getProjectIdx());
                    projectRepository.findById(rtm.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                dto.setEventDate(rtm.getTripDate());
                dto.setCardUsageDate(rtm.getTripDate());
                enrichWithCardInfo(dto, rtm.getCardIdx());
                dto.setLocation(rtm.getLocation());
                dto.setPurpose(rtm.getPurpose());
                dto.setAmount(rtm.getTotalFee());
                dto.setParticipantNames(buildParticipantNames(rtm.getIdx(), "RCTM"));
                dto.setAttachments(buildRctmAttachments(rtm.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode().equals(documentType)) {
            // 연구비증빙 야근식대의 원본 문서 ID 및 프로젝트 정보 조회
            receiptOvertimeRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptOvertime -> {
                dto.setSourceDocumentId(receiptOvertime.getIdx());
                if (receiptOvertime.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptOvertime.getProjectIdx());
                    if (receiptOvertime.getProject() != null) {
                        dto.setProjectName(receiptOvertime.getProject().getProjectName());
                    }
                }
                dto.setEventDate(receiptOvertime.getOvertimeDate());
                dto.setCardUsageDate(receiptOvertime.getOvertimeDate());
                enrichWithCardInfo(dto, receiptOvertime.getCardIdx());
                dto.setAmount(receiptOvertime.getTotalAmount());
                dto.setParticipantNames(buildParticipantNames(receiptOvertime.getIdx(), "RCO"));
                dto.setAttachments(buildOvertimeAttachments(receiptOvertime.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_MATERIAL.getCode().equals(documentType) || CodeConstants.DocumentType.RECEIPT_EQUIPMENT.getCode().equals(documentType)) {
            receiptPurchaseRepository.findByDocumentIdx(document.getIdx()).ifPresent(purchase -> {
                dto.setSourceDocumentId(purchase.getIdx());
                dto.setAmount(purchase.getTotalAmount());
                String formattedAmount = purchase.getTotalAmount() != null && purchase.getTotalAmount().compareTo(BigDecimal.ZERO) != 0
                        ? String.format("%,d", purchase.getTotalAmount().longValue()) + "원" : "0원";
                dto.setTitle(docTypeName + " - " + formattedAmount);
                if (purchase.getProjectIdx() != null) {
                    dto.setProjectIdx(purchase.getProjectIdx());
                    projectRepository.findById(purchase.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                if (purchase.getApprovalDate() != null) {
                    dto.setEventDate(purchase.getApprovalDate());
                }
                // 카드사용일자: item 중 가장 최근 itemDate (없으면 approvalDate fallback)
                dto.setCardUsageDate(computePurchaseCardUsageDate(purchase.getIdx(), purchase.getApprovalDate()));
                enrichWithCardInfo(dto, purchase.getCardIdx());
                String purposeText = purchase.getDocumentContent();
                if (purposeText == null || purposeText.isBlank()) {
                    purposeText = purchase.getDocumentTitle();
                }
                dto.setPurpose(purposeText);
                dto.setPaymentType(purchase.getPaymentType());
                dto.setAttachments(buildPurchaseAttachments(purchase.getIdx()));
            });
        } else if (CodeConstants.DocumentType.EXPENSE_APPROVAL.getCode().equals(documentType)) {
            expenseApprovalRepository.findByDocumentIdx(document.getIdx()).ifPresent(expense -> {
                dto.setSourceDocumentId(expense.getIdx());
                String stCode = expense.getSettlementStatus() != null ? expense.getSettlementStatus() : "C1001";
                CodeConstants.ExpenseSettlementStatus st = CodeConstants.ExpenseSettlementStatus.fromCodeOrNull(stCode);
                dto.setStatusCode(stCode);
                dto.setStatusName(st != null ? st.getName() : stCode);
                dto.setStatusComment(expense.getSettlementComment());
            });
        } else if (CodeConstants.DocumentType.EXPENSE_REQUEST.getCode().equals(documentType)) {
            expenseRequisitionRepository.findByDocumentIdxAndIsDeletedFalse(document.getIdx()).ifPresent(requisition -> {
                dto.setSourceDocumentId(requisition.getIdx());
            });
        } else if (CodeConstants.DocumentType.VACATION.getCode().equals(documentType)) {
            if (document.getStatus() != null) {
                dto.setStatusCode(document.getStatus());
                try {
                    CodeConstants.DocumentStatus ds = CodeConstants.DocumentStatus.fromCode(document.getStatus());
                    dto.setStatusName(ds.getName());
                } catch (IllegalArgumentException e) {
                    dto.setStatusName(document.getStatus());
                }
            } else {
                dto.setStatusCode(CodeConstants.DocumentStatus.DRAFTED.getCode());
                dto.setStatusName(CodeConstants.DocumentStatus.DRAFTED.getName());
            }
        }

        // 그 외 문서 — statusCode 미설정 시 approval_documents.status에서 읽기
        if (dto.getStatusCode() == null && document.getStatus() != null) {
            dto.setStatusCode(document.getStatus());
            try {
                CodeConstants.DocumentStatus ds = CodeConstants.DocumentStatus.fromCode(document.getStatus());
                dto.setStatusName(ds.getName());
            } catch (IllegalArgumentException e) {
                dto.setStatusName(document.getStatus());
            }
        }

        return dto;
    }

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByProject(Long projectIdx) {
        log.debug("[프로젝트별 문서 조회] projectIdx: {}", projectIdx);

        List<ApprovalDocumentDTO> result = new ArrayList<>();

        // 주간업무보고 조회
        result.addAll(getWeeklyReportsByProject(projectIdx));

        // 회의록 조회
        result.addAll(getMeetingMinutesByProject(projectIdx));

        // 단독 출장 조회
        result.addAll(getReceiptTripsByProject(projectIdx));

        // 단독 회의록 조회
        result.addAll(getReceiptMeetingsByProject(projectIdx));

        // 출장+회의 조회
        result.addAll(getReceiptTripMeetingsByProject(projectIdx));

        // 야근식대 조회
        result.addAll(getReceiptOvertimesByProject(projectIdx));

        // 재료비/장비비 조회
        result.addAll(getReceiptPurchasesByProject(projectIdx));

        // 최신순 정렬
        result.sort(Comparator.comparing(ApprovalDocumentDTO::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        log.debug("[프로젝트별 문서 조회] 완료 - projectIdx: {}, 총 {}건", projectIdx, result.size());
        return result;
    }

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByProjectAndType(Long projectIdx, String documentType) {
        log.debug("[프로젝트+타입별 문서 조회] projectIdx: {}, documentType: {}", projectIdx, documentType);

        List<ApprovalDocumentDTO> result;

        switch (documentType) {
            case "C0410":   // PROJECT_WEEKLY_REPORT
                result = getWeeklyReportsByProject(projectIdx);
                break;
            case "C0412":   // MEETING_MINUTES
                result = getMeetingMinutesByProject(projectIdx);
                break;
            case "C0404":   // RECEIPT_TRIP
                result = getReceiptTripsByProject(projectIdx);
                break;
            case "C0405":   // RECEIPT_TRIP_MEETING
                result = getReceiptTripMeetingsByProject(projectIdx);
                break;
            case "C0406":   // RECEIPT_MEETING
                result = getReceiptMeetingsByProject(projectIdx);
                break;
            case "C0403":   // RECEIPT_OVERTIME
                result = getReceiptOvertimesByProject(projectIdx);
                break;
            default:
                result = new ArrayList<>();
        }

        log.debug("[프로젝트+타입별 문서 조회] 완료 - projectIdx: {}, documentType: {}, 총 {}건",
                projectIdx, documentType, result.size());
        return result;
    }

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByProjectAndTypes(Long projectIdx, String[] documentTypes) {
        log.debug("[프로젝트+복수타입별 문서 조회] projectIdx: {}, documentTypes: {}",
                projectIdx, Arrays.toString(documentTypes));

        List<ApprovalDocumentDTO> result = new ArrayList<>();

        for (String type : documentTypes) {
            result.addAll(getDocumentsByProjectAndType(projectIdx, type.trim()));
        }

        // 최신순 정렬
        result.sort(Comparator.comparing(ApprovalDocumentDTO::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        log.debug("[프로젝트+복수타입별 문서 조회] 완료 - projectIdx: {}, 총 {}건", projectIdx, result.size());
        return result;
    }

    /**
     * 프로젝트별 주간업무보고 조회
     */
    private List<ApprovalDocumentDTO> getWeeklyReportsByProject(Long projectIdx) {
        List<WeeklyReport> reports = weeklyReportRepository.findByProjectIdx(projectIdx);

        return reports.stream()
                .map(this::convertWeeklyReportToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 프로젝트별 회의록 조회
     */
    private List<ApprovalDocumentDTO> getMeetingMinutesByProject(Long projectIdx) {
        List<MeetingsMinutes> minutes = meetingMinutesRepository.findByProjectIdxOrderByCreatedAtDesc(projectIdx);

        return minutes.stream()
                .map(this::convertMeetingMinutesToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 프로젝트별 단독 출장 조회
     */
    private List<ApprovalDocumentDTO> getReceiptTripsByProject(Long projectIdx) {
        List<ReceiptTrip> trips = receiptTripRepository.findByProjectIdxOrderByTripDateDesc(projectIdx);

        return trips.stream()
                .map(this::convertReceiptTripToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 프로젝트별 단독 회의록 조회
     */
    private List<ApprovalDocumentDTO> getReceiptMeetingsByProject(Long projectIdx) {
        List<ReceiptMeeting> meetings = receiptMeetingRepository.findByProjectIdxOrderByMeetingDateDesc(projectIdx);

        return meetings.stream()
                .map(this::convertReceiptMeetingToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 프로젝트별 출장+회의 조회
     */
    private List<ApprovalDocumentDTO> getReceiptTripMeetingsByProject(Long projectIdx) {
        return receiptTripMeetingRepository.findByProjectIdxOrderByTripDateDesc(projectIdx).stream()
                .map(rtm -> {
                    String projectName = projectRepository.findById(rtm.getProjectIdx())
                            .map(Project::getProjectName).orElse("프로젝트");
                    ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                            .idx(rtm.getDocumentIdx())
                            .sourceDocumentId(rtm.getIdx())
                            .documentType(CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode())
                            .documentTypeName(CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getName())
                            .documentNo(rtm.getDocumentNumber())
                            .title(projectName + " - 출장+회의 " + (rtm.getTripDate() != null ? rtm.getTripDate() : ""))
                            .drafterUserIdx(rtm.getDrafterUserIdx())
                            .projectIdx(rtm.getProjectIdx())
                            .projectName(projectName)
                            .createdAt(rtm.getCreatedAt())
                            .updatedAt(rtm.getUpdatedAt())
                            .build();
                    userRepository.findById(rtm.getDrafterUserIdx()).ifPresent(user -> {
                        dto.setDrafterName(user.getEmpName());
                        dto.setDrafterDept(user.getEmpDept());
                        if (user.getEmpDept() != null) {
                            codeRepository.findByGroupCodeAndCode(
                                    CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                                    .ifPresent(code -> dto.setDrafterDeptName(code.getCodeName()));
                        }
                    });
                    List<ReceiptTripMeetingSession> sessions = receiptTripMeetingSessionRepository
                            .findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(rtm.getIdx());
                    List<Long> sessionIds = sessions.stream()
                            .map(ReceiptTripMeetingSession::getIdx)
                            .collect(Collectors.toList());
                    dto.setMeetingSessionCount(Math.max(sessions.size(), 1));
                    dto.setMeetingSessionIds(sessionIds);
                    dto.setEventDate(rtm.getTripDate());
                    dto.setLocation(rtm.getLocation());
                    dto.setPurpose(rtm.getPurpose());
                    dto.setAmount(rtm.getTotalFee());
                    dto.setParticipantNames(buildParticipantNames(rtm.getIdx(), "RCTM"));
                    dto.setAttachments(buildRctmAttachments(rtm.getIdx()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * WeeklyReport → DTO 변환
     */
    private ApprovalDocumentDTO convertWeeklyReportToDTO(WeeklyReport report) {
        // Project 엔티티에서 프로젝트명 가져오기
        String projectName = report.getProject() != null ? report.getProject().getProjectName() : "프로젝트 미지정";

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(report.getDocumentIdx())
                .sourceDocumentId(report.getId())
                .title(projectName + " - " + report.getReportPeriod())
                .documentType(CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode())
                .documentTypeName(CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getName())
                .drafterUserIdx(report.getUserIdx())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();

        // 작성자 정보 조회
        userRepository.findById(report.getUserIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

        // 결재상태 조회
        if (report.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(report.getDocumentIdx()).ifPresent(doc -> {
                dto.setDocumentNo(doc.getDocumentNo());
            });
        }

        return dto;
    }

    /**
     * MeetingsMinutes → DTO 변환
     */
    private ApprovalDocumentDTO convertMeetingMinutesToDTO(MeetingsMinutes minutes) {
        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(minutes.getDocumentIdx())
                .sourceDocumentId(minutes.getId())
                .title(minutes.getMeetingTitle())
                .documentType(CodeConstants.DocumentType.MEETING_MINUTES.getCode())
                .documentTypeName(CodeConstants.DocumentType.MEETING_MINUTES.getName())
                .drafterUserIdx(minutes.getUserIdx())
                .createdAt(minutes.getCreatedAt())
                .updatedAt(minutes.getUpdatedAt())
                .build();

        // 작성자 정보 조회
        userRepository.findById(minutes.getUserIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

        // 문서번호 조회
        if (minutes.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(minutes.getDocumentIdx()).ifPresent(doc -> {
                dto.setDocumentNo(doc.getDocumentNo());
            });
        }

        return dto;
    }

    /**
     * 연구비증빙 제목 생성: 프로젝트명 (카드번호) - YYYY-MM-DD/금액원
     */
    private String buildReceiptTitle(String projectName, String cardLastDigits, LocalDate date, BigDecimal amount) {
        StringBuilder title = new StringBuilder();
        title.append(projectName != null ? projectName : "프로젝트");

        if (cardLastDigits != null && !cardLastDigits.isEmpty()) {
            title.append(" (").append(cardLastDigits).append(")");
        }

        title.append(" - ");
        title.append(date != null ? date.toString() : "-");
        title.append(" / ");

        if (amount != null && amount.compareTo(BigDecimal.ZERO) != 0) {
            title.append(String.format("%,d", amount.longValue())).append("원");
        } else {
            title.append("0원");
        }

        return title.toString();
    }

    /**
     * ReceiptTrip → DTO 변환
     */
    private ApprovalDocumentDTO convertReceiptTripToDTO(ReceiptTrip trip) {
        // 문서번호는 approval_documents 테이블에서 조회
        String documentNo = null;
        if (trip.getApprovalDocument() != null) {
            documentNo = trip.getApprovalDocument().getDocumentNo();
        }

        // 출장 총액
        BigDecimal tripTotal = trip.getTotalFee() != null ? trip.getTotalFee() : BigDecimal.ZERO;

        // 제목 생성: 프로젝트명 (카드번호) - 날짜/금액원
        String projectName = trip.getProject() != null ? trip.getProject().getProjectName() : "프로젝트";
        String title = buildReceiptTitle(projectName, null, trip.getTripDate(), tripTotal);

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(trip.getDocumentIdx())
                .sourceDocumentId(trip.getIdx())
                .documentNo(documentNo)
                .title(title)
                .documentType(CodeConstants.DocumentType.RECEIPT_TRIP.getCode())
                .documentTypeName(CodeConstants.DocumentType.RECEIPT_TRIP.getName())
                .drafterUserIdx(trip.getDrafterUserIdx())
                .createdAt(trip.getCreatedAt())
                .updatedAt(trip.getUpdatedAt())
                .amount(tripTotal)
                .build();

        // 작성자 정보 (users 테이블에서 조회)
        userRepository.findById(trip.getDrafterUserIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

        dto.setEventDate(trip.getTripDate());
        dto.setLocation(trip.getLocation());
        dto.setParticipantNames(buildParticipantNames(trip.getIdx(), "RCT"));
        if (trip.getProject() != null) {
            dto.setProjectIdx(trip.getProjectIdx());
            dto.setProjectName(trip.getProject().getProjectName());
        }
        dto.setAttachments(buildTripAttachments(trip.getIdx()));

        return dto;
    }

    /**
     * ReceiptMeeting → DTO 변환
     */
    private ApprovalDocumentDTO convertReceiptMeetingToDTO(ReceiptMeeting meeting) {
        // 문서번호는 approval_documents 테이블에서 조회
        String documentNo = null;
        if (meeting.getApprovalDocument() != null) {
            documentNo = meeting.getApprovalDocument().getDocumentNo();
        }

        // 제목 생성: 프로젝트명 (카드번호) - 날짜/금액원
        String projectName = meeting.getProject() != null ? meeting.getProject().getProjectName() : "프로젝트";
        String cardDigits = meeting.getProjectCard() != null ? meeting.getProjectCard().getCardLastDigits() : null;
        String title = buildReceiptTitle(projectName, cardDigits, meeting.getMeetingDate(), meeting.getAmount());

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(meeting.getDocumentIdx())
                .sourceDocumentId(meeting.getIdx())
                .documentNo(documentNo)
                .title(title)
                .documentType(CodeConstants.DocumentType.RECEIPT_MEETING.getCode())
                .documentTypeName(CodeConstants.DocumentType.RECEIPT_MEETING.getName())
                .drafterUserIdx(meeting.getAuthorIdx())
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .amount(meeting.getAmount())
                .build();

        // 작성자 정보 (users 테이블에서 조회)
        userRepository.findById(meeting.getAuthorIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

        dto.setEventDate(meeting.getMeetingDate());
        dto.setPurpose(meeting.getPurpose());
        dto.setParticipantNames(buildParticipantNames(meeting.getIdx(), "RCM"));
        if (meeting.getProject() != null) {
            dto.setProjectIdx(meeting.getProjectIdx());
            dto.setProjectName(meeting.getProject().getProjectName());
        }
        dto.setAttachments(buildMeetingAttachments(meeting.getIdx()));

        return dto;
    }

    /**
     * 프로젝트별 야근식대 조회
     */
    private List<ApprovalDocumentDTO> getReceiptOvertimesByProject(Long projectIdx) {
        List<ReceiptOvertime> overtimes = receiptOvertimeRepository.findByProjectIdxOrderByOvertimeDateDesc(projectIdx);

        return overtimes.stream()
                .map(this::convertReceiptOvertimeToDTO)
                .collect(Collectors.toList());
    }

    /**
     * ReceiptOvertime → DTO 변환
     */
    private ApprovalDocumentDTO convertReceiptOvertimeToDTO(ReceiptOvertime overtime) {
        // 제목 생성: 프로젝트명 (카드번호) - 날짜/금액원
        String projectName = overtime.getProject() != null ? overtime.getProject().getProjectName() : "프로젝트";
        String cardDigits = null;
        if (overtime.getCardIdx() != null) {
            ProjectCard card = projectCardRepository.findById(overtime.getCardIdx()).orElse(null);
            if (card != null) {
                cardDigits = card.getCardLastDigits();
            }
        }
        String title = buildReceiptTitle(projectName, cardDigits, overtime.getOvertimeDate(), overtime.getTotalAmount());

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(overtime.getDocumentIdx())
                .sourceDocumentId(overtime.getIdx())
                .title(title)
                .documentType(CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode())
                .documentTypeName(CodeConstants.DocumentType.RECEIPT_OVERTIME.getName())
                .drafterUserIdx(overtime.getAuthorIdx())
                .createdAt(overtime.getCreatedAt())
                .updatedAt(overtime.getUpdatedAt())
                .amount(overtime.getTotalAmount())
                .build();

        // 작성자 정보 (users 테이블에서 조회)
        userRepository.findById(overtime.getAuthorIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

        dto.setEventDate(overtime.getOvertimeDate());
        dto.setParticipantNames(buildParticipantNames(overtime.getIdx(), "RCO"));
        if (overtime.getProject() != null) {
            dto.setProjectIdx(overtime.getProjectIdx());
            dto.setProjectName(overtime.getProject().getProjectName());
        }
        dto.setAttachments(buildOvertimeAttachments(overtime.getIdx()));

        return dto;
    }

    private List<ApprovalDocumentDTO> getReceiptPurchasesByProject(Long projectIdx) {
        return receiptPurchaseRepository.findByProjectIdxOrderByApprovalDateDesc(projectIdx).stream()
                .map(this::convertReceiptPurchaseToDTO)
                .collect(Collectors.toList());
    }

    private ApprovalDocumentDTO convertReceiptPurchaseToDTO(ReceiptPurchase purchase) {
        CodeConstants.DocumentType docType = "material".equals(purchase.getPurchaseType())
                ? CodeConstants.DocumentType.RECEIPT_MATERIAL
                : CodeConstants.DocumentType.RECEIPT_EQUIPMENT;
        String formattedAmount = purchase.getTotalAmount() != null && purchase.getTotalAmount().compareTo(BigDecimal.ZERO) != 0
                ? String.format("%,d", purchase.getTotalAmount().longValue()) + "원" : "0원";

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(purchase.getDocumentIdx())
                .sourceDocumentId(purchase.getIdx())
                .title(docType.getName() + " - " + formattedAmount)
                .documentType(docType.getCode())
                .documentTypeName(docType.getName())
                .drafterUserIdx(purchase.getAuthorIdx())
                .content(purchase.getDocumentContent())
                .createdAt(purchase.getCreatedAt())
                .updatedAt(purchase.getUpdatedAt())
                .amount(purchase.getTotalAmount())
                .projectIdx(purchase.getProjectIdx())
                .eventDate(purchase.getApprovalDate())
                .paymentType(purchase.getPaymentType())
                .build();

        String purposeText = purchase.getDocumentContent();
        if (purposeText == null || purposeText.isBlank()) {
            purposeText = purchase.getDocumentTitle();
        }
        dto.setPurpose(purposeText);
        dto.setAttachments(buildPurchaseAttachments(purchase.getIdx()));

        if (purchase.getProjectIdx() != null) {
            projectRepository.findById(purchase.getProjectIdx()).ifPresent(project ->
                    dto.setProjectName(project.getProjectName()));
        }

        userRepository.findById(purchase.getAuthorIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                        .ifPresent(code -> dto.setDrafterDeptName(code.getCodeName()));
            }
        });

        return dto;
    }

    /**
     * 회의록 첨부파일 요약 목록 생성 (빠른 다운로드용)
     */
    private List<AttachmentSummaryDTO> buildMeetingAttachments(Long receiptMeetingIdx) {
        return receiptMeetingAttachmentRepository.findByReceiptMeetingIdx(receiptMeetingIdx).stream()
                .map(a -> AttachmentSummaryDTO.builder()
                        .idx(a.getIdx())
                        .originalFilename(a.getOriginalFilename())
                        .attachmentType(a.getAttachmentType())
                        .downloadUrl("/api/receipt-meetings/attachments/" + a.getIdx() + "/download")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 야근식대 첨부파일 요약 목록 생성 (빠른 다운로드용)
     */
    private List<AttachmentSummaryDTO> buildOvertimeAttachments(Long receiptOvertimeIdx) {
        return receiptOvertimeAttachmentRepository
                .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(receiptOvertimeIdx).stream()
                .map(a -> AttachmentSummaryDTO.builder()
                        .idx(a.getIdx())
                        .originalFilename(a.getOriginalFilename())
                        .attachmentType(a.getAttachmentType())
                        .downloadUrl("/api/receipt-overtimes/attachments/" + a.getIdx() + "/download")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 단독출장 첨부파일 요약 목록 생성 (빠른 다운로드용)
     */
    private List<AttachmentSummaryDTO> buildTripAttachments(Long receiptTripIdx) {
        return receiptTripAttachmentRepository.findByReceiptTripIdxAndDeletedFalseOrderByIdxAsc(receiptTripIdx).stream()
                .map(a -> AttachmentSummaryDTO.builder()
                        .idx(a.getIdx())
                        .originalFilename(a.getOriginalFilename())
                        .attachmentType(a.getAttachmentType())
                        .downloadUrl("/api/receipt-trips/attachments/" + a.getIdx() + "/download")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 출장+회의(RCTM) 첨부파일 요약 목록 생성
     * sessionIdx 포함 → 프론트에서 세션별 분류에 사용
     */
    private List<AttachmentSummaryDTO> buildRctmAttachments(Long rtmIdx) {
        return receiptTripMeetingAttachmentRepository
                .findByReceiptTripMeetingIdxAndDeletedFalseOrderByIdxAsc(rtmIdx).stream()
                .map(a -> AttachmentSummaryDTO.builder()
                        .idx(a.getIdx())
                        .originalFilename(a.getOriginalFilename())
                        .attachmentType(a.getAttachmentType())
                        .sessionIdx(a.getSessionIdx())
                        .downloadUrl("/api/receipt-trip-meetings/attachments/" + a.getIdx() + "/download")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 재료비/장비비 첨부파일 요약 목록 생성
     */
    private List<AttachmentSummaryDTO> buildPurchaseAttachments(Long receiptPurchaseIdx) {
        return receiptPurchaseAttachmentRepository
                .findByReceiptPurchaseIdxAndDeletedFalseOrderByIdxAsc(receiptPurchaseIdx).stream()
                .map(a -> AttachmentSummaryDTO.builder()
                        .idx(a.getIdx())
                        .originalFilename(a.getOriginalFilename())
                        .attachmentType(a.getAttachmentType())
                        .downloadUrl("/api/receipt-purchases/attachments/" + a.getIdx() + "/download")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 참석자 이름 목록을 쉼표 구분 문자열로 반환
     */
    private String buildParticipantNames(Long receiptIdx, String prefix) {
        return receiptAttendeeRepository.findAttendeesWithAllPersonInfo(receiptIdx, prefix).stream()
                .map(row -> {
                    ReceiptAttendee attendee = (ReceiptAttendee) row[0];
                    User user = (User) row[1];
                    ExternalPerson ep = (ExternalPerson) row[2];
                    if (Boolean.TRUE.equals(attendee.getIsExternal()) && ep != null) {
                        return ep.getName();
                    } else if (user != null) {
                        return user.getEmpName();
                    }
                    return null;
                })
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.joining(", "));
    }

    // ============================================================
    // 관리자 연구비증빙 페이지 전용 헬퍼 / 조회
    // ============================================================

    /**
     * cardIdx로 ProjectCard를 조회해서 DTO에 카드 정보를 채운다.
     */
    private void enrichWithCardInfo(ApprovalDocumentDTO dto, Long cardIdx) {
        if (cardIdx == null) return;
        dto.setCardIdx(cardIdx);
        projectCardRepository.findById(cardIdx).ifPresent(card -> {
            dto.setCardCompany(card.getCardCompany());
            dto.setCardLastDigits(card.getCardLastDigits());
            dto.setCardNickname(card.getCardNickname());
        });
    }

    /**
     * 재료비/장비비 한 문서의 대표 카드사용일자.
     * - 각 item의 itemDate 중 가장 최근(MAX) 값을 사용
     * - 모든 item의 itemDate가 null이면 approvalDate(품의일자)로 fallback
     */
    private LocalDate computePurchaseCardUsageDate(Long purchaseIdx, LocalDate fallback) {
        if (purchaseIdx == null) return fallback;
        return receiptPurchaseItemRepository.findByReceiptPurchaseIdxOrderBySortOrderAsc(purchaseIdx).stream()
                .map(ReceiptPurchaseItem::getItemDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(fallback);
    }

    /**
     * 사용자 IDX 목록을 배치로 로딩하여 Map 반환 (N+1 방지용)
     */
    private Map<Long, User> batchLoadUsers(Set<Long> userIdxs) {
        if (userIdxs.isEmpty()) return Collections.emptyMap();
        return userRepository.findAllById(userIdxs).stream()
                .collect(Collectors.toMap(User::getIdx, u -> u));
    }

    /**
     * 부서 코드 → 부서명 Map 반환 (N+1 방지용)
     */
    private Map<String, String> loadDeptCodeNameMap() {
        return codeRepository.findByGroupCode(CodeConstants.GroupCode.DEPARTMENT.getCode()).stream()
                .collect(Collectors.toMap(Code::getCode, Code::getCodeName, (a, b) -> a));
    }

    /**
     * Entity → DTO 변환 (배치 로딩된 사용자/부서코드 Map 활용 — N+1 최적화)
     */
    private ApprovalDocumentDTO convertToDTO(ApprovalDocument document, Map<Long, User> userMap, Map<String, String> deptCodeNameMap) {
        String docTypeCode = document.getDocumentType();
        CodeConstants.DocumentType docTypeEnum = CodeConstants.DocumentType.fromCodeOrNull(docTypeCode);
        String docTypeName = docTypeEnum != null ? docTypeEnum.getName() : docTypeCode;

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(document.getIdx())
                .documentNo(document.getDocumentNo())
                .title(document.getTitle())
                .documentType(docTypeCode)
                .documentTypeName(docTypeName)
                .drafterUserIdx(document.getDrafterUserIdx())
                .content(document.getContent())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();

        // 작성자 정보: Map에서 조회 (DB 쿼리 없음)
        if (document.getCreatedUserIdx() != null) {
            User user = userMap.get(document.getCreatedUserIdx());
            if (user != null) {
                dto.setDrafterName(user.getEmpName());
                dto.setDrafterDept(user.getEmpDept());
                if (user.getEmpDept() != null) {
                    dto.setDrafterDeptName(deptCodeNameMap.get(user.getEmpDept()));
                }
            } else {
                log.error("!!! 사용자 정보 없음 - createdUserIdx: {}", document.getCreatedUserIdx());
            }
        } else {
            log.error("!!! createdUserIdx가 null - 문서 IDX: {}", document.getIdx());
        }

        // 원본 문서 ID 조회 및 설정 (타입별 단건 쿼리 유지)
        String documentType = document.getDocumentType();
        if (CodeConstants.DocumentType.WEEKLY_REPORT.getCode().equals(documentType) || CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(documentType)) {
            weeklyReportRepository.findByDocumentIdx(document.getIdx()).ifPresent(weeklyReport -> {
                dto.setSourceDocumentId(weeklyReport.getId());
                if (weeklyReport.getProjectIdx() != null) {
                    dto.setProjectIdx(weeklyReport.getProjectIdx());
                    projectRepository.findById(weeklyReport.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
            });
        } else if (CodeConstants.DocumentType.RECEIPT_MEETING.getCode().equals(documentType)) {
            receiptMeetingRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptMeeting -> {
                dto.setSourceDocumentId(receiptMeeting.getIdx());
                if (receiptMeeting.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptMeeting.getProjectIdx());
                    projectRepository.findById(receiptMeeting.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                dto.setEventDate(receiptMeeting.getMeetingDate());
                dto.setCardUsageDate(receiptMeeting.getMeetingDate());
                enrichWithCardInfo(dto, receiptMeeting.getCardIdx());
                dto.setPurpose(receiptMeeting.getPurpose());
                dto.setAmount(receiptMeeting.getAmount());
                dto.setParticipantNames(buildParticipantNames(receiptMeeting.getIdx(), "RCM"));
                dto.setAttachments(buildMeetingAttachments(receiptMeeting.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_TRIP.getCode().equals(documentType)) {
            receiptTripRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptTrip -> {
                dto.setSourceDocumentId(receiptTrip.getIdx());
                if (receiptTrip.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptTrip.getProjectIdx());
                    projectRepository.findById(receiptTrip.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                dto.setEventDate(receiptTrip.getTripDate());
                dto.setCardUsageDate(receiptTrip.getTripDate());
                enrichWithCardInfo(dto, receiptTrip.getCardIdx());
                dto.setLocation(receiptTrip.getLocation());
                dto.setAmount(receiptTrip.getTotalFee());
                dto.setParticipantNames(buildParticipantNames(receiptTrip.getIdx(), "RCT"));
                dto.setAttachments(buildTripAttachments(receiptTrip.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode().equals(documentType)) {
            receiptTripMeetingRepository.findByDocumentIdx(document.getIdx()).ifPresent(rtm -> {
                dto.setSourceDocumentId(rtm.getIdx());
                if (rtm.getProjectIdx() != null) {
                    dto.setProjectIdx(rtm.getProjectIdx());
                    projectRepository.findById(rtm.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                dto.setEventDate(rtm.getTripDate());
                dto.setCardUsageDate(rtm.getTripDate());
                enrichWithCardInfo(dto, rtm.getCardIdx());
                dto.setLocation(rtm.getLocation());
                dto.setPurpose(rtm.getPurpose());
                dto.setAmount(rtm.getTotalFee());
                dto.setParticipantNames(buildParticipantNames(rtm.getIdx(), "RCTM"));
                dto.setAttachments(buildRctmAttachments(rtm.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode().equals(documentType)) {
            receiptOvertimeRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptOvertime -> {
                dto.setSourceDocumentId(receiptOvertime.getIdx());
                if (receiptOvertime.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptOvertime.getProjectIdx());
                    if (receiptOvertime.getProject() != null) {
                        dto.setProjectName(receiptOvertime.getProject().getProjectName());
                    }
                }
                dto.setEventDate(receiptOvertime.getOvertimeDate());
                dto.setCardUsageDate(receiptOvertime.getOvertimeDate());
                enrichWithCardInfo(dto, receiptOvertime.getCardIdx());
                dto.setAmount(receiptOvertime.getTotalAmount());
                dto.setParticipantNames(buildParticipantNames(receiptOvertime.getIdx(), "RCO"));
                dto.setAttachments(buildOvertimeAttachments(receiptOvertime.getIdx()));
            });
        } else if (CodeConstants.DocumentType.RECEIPT_MATERIAL.getCode().equals(documentType) || CodeConstants.DocumentType.RECEIPT_EQUIPMENT.getCode().equals(documentType)) {
            receiptPurchaseRepository.findByDocumentIdx(document.getIdx()).ifPresent(purchase -> {
                dto.setSourceDocumentId(purchase.getIdx());
                dto.setAmount(purchase.getTotalAmount());
                String formattedAmount = purchase.getTotalAmount() != null && purchase.getTotalAmount().compareTo(BigDecimal.ZERO) != 0
                        ? String.format("%,d", purchase.getTotalAmount().longValue()) + "원" : "0원";
                dto.setTitle(docTypeName + " - " + formattedAmount);
                if (purchase.getProjectIdx() != null) {
                    dto.setProjectIdx(purchase.getProjectIdx());
                    projectRepository.findById(purchase.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
                if (purchase.getApprovalDate() != null) {
                    dto.setEventDate(purchase.getApprovalDate());
                }
                dto.setCardUsageDate(computePurchaseCardUsageDate(purchase.getIdx(), purchase.getApprovalDate()));
                enrichWithCardInfo(dto, purchase.getCardIdx());
                String purposeText = purchase.getDocumentContent();
                if (purposeText == null || purposeText.isBlank()) {
                    purposeText = purchase.getDocumentTitle();
                }
                dto.setPurpose(purposeText);
                dto.setPaymentType(purchase.getPaymentType());
                dto.setAttachments(buildPurchaseAttachments(purchase.getIdx()));
            });
        } else if (CodeConstants.DocumentType.EXPENSE_APPROVAL.getCode().equals(documentType)) {
            expenseApprovalRepository.findByDocumentIdx(document.getIdx()).ifPresent(expense -> {
                dto.setSourceDocumentId(expense.getIdx());
                String stCode = expense.getSettlementStatus() != null ? expense.getSettlementStatus() : "C1001";
                CodeConstants.ExpenseSettlementStatus st = CodeConstants.ExpenseSettlementStatus.fromCodeOrNull(stCode);
                dto.setStatusCode(stCode);
                dto.setStatusName(st != null ? st.getName() : stCode);
                dto.setStatusComment(expense.getSettlementComment());
            });
        } else if (CodeConstants.DocumentType.EXPENSE_REQUEST.getCode().equals(documentType)) {
            expenseRequisitionRepository.findByDocumentIdxAndIsDeletedFalse(document.getIdx()).ifPresent(requisition -> {
                dto.setSourceDocumentId(requisition.getIdx());
            });
        } else if (CodeConstants.DocumentType.VACATION.getCode().equals(documentType)) {
            // 문서 상태는 approval_documents.status(C05 코드)에서 직접 조회
            if (document.getStatus() != null) {
                dto.setStatusCode(document.getStatus());
                try {
                    CodeConstants.DocumentStatus ds = CodeConstants.DocumentStatus.fromCode(document.getStatus());
                    dto.setStatusName(ds.getName());
                } catch (IllegalArgumentException e) {
                    dto.setStatusName(document.getStatus());
                }
            } else {
                dto.setStatusCode(CodeConstants.DocumentStatus.DRAFTED.getCode());
                dto.setStatusName(CodeConstants.DocumentStatus.DRAFTED.getName());
            }
        }

        // 그 외 문서 — statusCode가 아직 설정 안 된 경우 approval_documents.status에서 읽기
        if (dto.getStatusCode() == null && document.getStatus() != null) {
            dto.setStatusCode(document.getStatus());
            try {
                CodeConstants.DocumentStatus ds = CodeConstants.DocumentStatus.fromCode(document.getStatus());
                dto.setStatusName(ds.getName());
            } catch (IllegalArgumentException e) {
                dto.setStatusName(document.getStatus());
            }
        }

        return dto;
    }

    /**
     * [관리자 전용] 연구비증빙 6종 문서 조회.
     * - year/month 기준으로 카드사용일자가 해당 월에 속하는 문서만 반환
     * - 카드사용일자 내림차순 정렬
     */
    @Override
    public List<ApprovalDocumentDTO> getAdminReceiptDocuments(int year, int month) {
        log.debug("[관리자 연구비증빙 조회] year: {}, month: {}", year, month);

        Set<String> receiptTypes = Set.of(
                CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode(),
                CodeConstants.DocumentType.RECEIPT_TRIP.getCode(),
                CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode(),
                CodeConstants.DocumentType.RECEIPT_MEETING.getCode(),
                CodeConstants.DocumentType.RECEIPT_MATERIAL.getCode(),
                CodeConstants.DocumentType.RECEIPT_EQUIPMENT.getCode()
        );

        List<ApprovalDocument> documents = approvalDocumentRepository.findProjectDocuments();
        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                .filter(dto -> dto.getSourceDocumentId() != null)
                .filter(dto -> receiptTypes.contains(dto.getDocumentType()))
                .filter(dto -> {
                    LocalDate d = dto.getCardUsageDate();
                    if (d == null) return false;
                    return d.getYear() == year && d.getMonthValue() == month;
                })
                .sorted(Comparator.comparing(ApprovalDocumentDTO::getCardUsageDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        log.debug("[관리자 연구비증빙 조회] 완료 - 총 {}건", result.size());
        return result;
    }
}
