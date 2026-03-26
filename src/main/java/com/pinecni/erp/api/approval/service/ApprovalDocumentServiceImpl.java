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
import com.pinecni.erp.api.expense.repository.ExpenseApprovalRepository;
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
import java.util.Comparator;
import java.util.List;
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
    private final ProjectCardRepository projectCardRepository;
    private final ProjectRepository projectRepository;
    private final ReceiptMeetingAttachmentRepository receiptMeetingAttachmentRepository;
    private final ReceiptOvertimeAttachmentRepository receiptOvertimeAttachmentRepository;
    private final ReceiptTripAttachmentRepository receiptTripAttachmentRepository;
    private final ReceiptTripMeetingSessionRepository receiptTripMeetingSessionRepository;
    private final ReceiptTripMeetingAttachmentRepository receiptTripMeetingAttachmentRepository;
    private final ExpenseApprovalRepository expenseApprovalRepository;
    private final ExpenseRequisitionRepository expenseRequisitionRepository;
    private final ReceiptAttendeeRepository receiptAttendeeRepository;

    @Override
    public List<ApprovalDocumentDTO> getAllDocuments(Long currentUserIdx) {
        log.debug("[일반 전자결재 문서 조회] 시작 - 현재 사용자: {}", currentUserIdx);

        // is_project = false인 일반 전자결재 문서만 조회
        List<ApprovalDocument> documents = approvalDocumentRepository.findGeneralDocuments();

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
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
     * 프로젝트 문서 전체 조회 (is_project = true)
     * @return 프로젝트 문서 목록
     */
    public List<ApprovalDocumentDTO> getAllProjectDocuments() {
        log.debug("[프로젝트 문서 전체 조회] 시작");

        // is_project = true인 프로젝트 문서만 조회
        List<ApprovalDocument> documents = approvalDocumentRepository.findProjectDocuments();

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                // 원본 문서가 삭제된 경우 sourceDocumentId가 null이 되므로 제외
                .filter(dto -> dto.getSourceDocumentId() != null)
                .collect(Collectors.toList());

        log.debug("[프로젝트 문서 전체 조회] 완료 - 총 {}건", result.size());
        return result;
    }

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
                dto.setLocation(rtm.getLocation());
                dto.setPurpose(rtm.getPurpose());
                dto.setAmount(rtm.getTotalFee());
                dto.setParticipantNames(buildParticipantNames(rtm.getIdx(), "RCTM"));
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
            });
        } else if (CodeConstants.DocumentType.EXPENSE_APPROVAL.getCode().equals(documentType)) {
            expenseApprovalRepository.findByDocumentIdx(document.getIdx()).ifPresent(expense -> {
                dto.setSourceDocumentId(expense.getIdx());
            });
        } else if (CodeConstants.DocumentType.EXPENSE_REQUEST.getCode().equals(documentType)) {
            expenseRequisitionRepository.findByDocumentIdxAndIsDeletedFalse(document.getIdx()).ifPresent(requisition -> {
                dto.setSourceDocumentId(requisition.getIdx());
            });
        }
        // 다른 문서 타입들도 필요시 추가
        // else if ("월간업무보고".equals(documentType)) { ... }
        // else if ("회의록".equals(documentType)) { ... }

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
                .build();

        dto.setPurpose(purchase.getDocumentContent());

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
}
