package com.pinecni.erp.api.approval.service;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.document.repository.MeetingMinutesRepository;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
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
    private final ReceiptOvertimeRepository receiptOvertimeRepository;
    private final ProjectCardRepository projectCardRepository;
    private final ProjectRepository projectRepository;

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
                    if ("주간업무보고".equals(dto.getDocumentType()) || "프로젝트 주간업무보고".equals(dto.getDocumentType())) {
                        return dto.getSourceDocumentId() != null;
                    }
                    // 연차신청서는 본인이 작성한 것만 포함
                    if ("연차신청서".equals(dto.getDocumentType())) {
                        return dto.getDrafterUserIdx().equals(currentUserIdx);
                    }
                    // 다른 문서 타입은 일단 모두 포함
                    return true;
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
                .filter(dto -> {
                    // 원본 문서가 존재하는 것만 포함
                    if ("주간업무보고".equals(dto.getDocumentType()) || "프로젝트 주간업무보고".equals(dto.getDocumentType())) {
                        return dto.getSourceDocumentId() != null;
                    }
                    return true;
                })
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
                    if ("주간업무보고".equals(dto.getDocumentType()) || "프로젝트 주간업무보고".equals(dto.getDocumentType())) {
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
                    if ("주간업무보고".equals(dto.getDocumentType()) || "프로젝트 주간업무보고".equals(dto.getDocumentType())) {
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
        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(document.getIdx())
                .documentNo(document.getDocumentNo())
                .title(document.getTitle())
                .documentType(document.getDocumentType())
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
        if ("주간업무보고".equals(documentType) || "프로젝트 주간업무보고".equals(documentType)) {
            weeklyReportRepository.findByDocumentIdx(document.getIdx()).ifPresent(weeklyReport -> {
                dto.setSourceDocumentId(weeklyReport.getId());
                if (weeklyReport.getProjectIdx() != null) {
                    dto.setProjectIdx(weeklyReport.getProjectIdx());
                    projectRepository.findById(weeklyReport.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
            });
        } else if ("연구비증빙-회의록".equals(documentType) || "연구비증빙(회의록)".equals(documentType) || "receipt_meeting".equals(documentType)) {
            // 연구비증빙 회의록의 원본 문서 ID 및 프로젝트 정보 조회
            receiptMeetingRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptMeeting -> {
                dto.setSourceDocumentId(receiptMeeting.getIdx());
                if (receiptMeeting.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptMeeting.getProjectIdx());
                    projectRepository.findById(receiptMeeting.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
            });
        } else if ("연구비증빙-출장".equals(documentType) || "연구비증빙(출장)".equals(documentType) || "receipt_trip".equals(documentType)) {
            // 연구비증빙 출장의 원본 문서 ID 및 프로젝트 정보 조회
            receiptTripRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptTrip -> {
                dto.setSourceDocumentId(receiptTrip.getIdx());
                if (receiptTrip.getProjectIdx() != null) {
                    dto.setProjectIdx(receiptTrip.getProjectIdx());
                    projectRepository.findById(receiptTrip.getProjectIdx()).ifPresent(project -> {
                        dto.setProjectName(project.getProjectName());
                    });
                }
            });
        } else if ("연구비증빙-야근식대".equals(documentType) || "연구비증빙(야근식대)".equals(documentType) || "receipt_overtime".equals(documentType)) {
            // 연구비증빙 야근식대의 원본 문서 ID 및 프로젝트 정보 조회
            receiptOvertimeRepository.findByDocumentIdx(document.getIdx()).ifPresent(receiptOvertime -> {
                dto.setSourceDocumentId(receiptOvertime.getId());
                if (receiptOvertime.getProjectIdx() != null && receiptOvertime.getProjectIdx().getIdx() != null) {
                    dto.setProjectIdx(receiptOvertime.getProjectIdx().getIdx());
                    dto.setProjectName(receiptOvertime.getProjectIdx().getProjectName());
                }
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

        // 출장 조회
        result.addAll(getReceiptTripsByProject(projectIdx));

        // 출장+회의 조회
        result.addAll(getReceiptMeetingsByProject(projectIdx));

        // 야근식대 조회
        result.addAll(getReceiptOvertimesByProject(projectIdx));

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
            case "WEEKLY_REPORT":
                result = getWeeklyReportsByProject(projectIdx);
                break;
            case "MEETING_MINUTES":
                result = getMeetingMinutesByProject(projectIdx);
                break;
            case "BUSINESS_TRIP":
                result = getReceiptTripsByProject(projectIdx);
                break;
            case "RECEIPT_MEETING":
                result = getReceiptMeetingsByProject(projectIdx);
                break;
            case "RECEIPT_OVERTIME":
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
     * 프로젝트별 출장 조회
     */
    private List<ApprovalDocumentDTO> getReceiptTripsByProject(Long projectIdx) {
        List<ReceiptTrip> trips = receiptTripRepository.findByProjectIdxOrderByTripDateDesc(projectIdx);

        return trips.stream()
                .map(this::convertReceiptTripToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 프로젝트별 출장+회의 조회
     */
    private List<ApprovalDocumentDTO> getReceiptMeetingsByProject(Long projectIdx) {
        List<ReceiptMeeting> meetings = receiptMeetingRepository.findByProjectIdxOrderByMeetingDateDesc(projectIdx);

        return meetings.stream()
                .map(this::convertReceiptMeetingToDTO)
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
                .documentType("WEEKLY_REPORT")
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
                .documentType("MEETING_MINUTES")
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

        // 출장 총액 계산 (교통비 + 숙박비 + 식비 + 기타)
        BigDecimal tripTotal = BigDecimal.ZERO;
        if (trip.getTransportationFee() != null) tripTotal = tripTotal.add(trip.getTransportationFee());
        if (trip.getAccommodationFee() != null) tripTotal = tripTotal.add(trip.getAccommodationFee());
        if (trip.getMealFee() != null) tripTotal = tripTotal.add(trip.getMealFee());
        if (trip.getOtherFee() != null) tripTotal = tripTotal.add(trip.getOtherFee());

        // 제목 생성: 프로젝트명 (카드번호) - 날짜/금액원
        String projectName = trip.getProject() != null ? trip.getProject().getProjectName() : "프로젝트";
        String title = buildReceiptTitle(projectName, null, trip.getTripDate(), tripTotal);

        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(trip.getDocumentIdx())
                .sourceDocumentId(trip.getIdx())
                .documentNo(documentNo)
                .title(title)
                .documentType("BUSINESS_TRIP")
                .drafterUserIdx(trip.getAuthorIdx())
                .createdAt(trip.getCreatedAt())
                .updatedAt(trip.getUpdatedAt())
                .amount(tripTotal)
                .build();

        // 작성자 정보 (users 테이블에서 조회)
        userRepository.findById(trip.getAuthorIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());
            if (user.getEmpDept() != null) {
                codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

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
                .documentType("RECEIPT_MEETING")
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
        String projectName = overtime.getProjectIdx() != null ? overtime.getProjectIdx().getProjectName() : "프로젝트";
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
                .sourceDocumentId(overtime.getId())
                .title(title)
                .documentType("RECEIPT_OVERTIME")
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

        return dto;
    }
}
