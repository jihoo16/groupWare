package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.externalperson.repository.ExternalPersonRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * ReceiptMeeting Entity ↔ DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class ReceiptMeetingMapper {

    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final ExternalPersonRepository externalPersonRepository;

    /**
     * Entity → DTO 변환
     */
    public ReceiptMeetingDTO toDTO(ReceiptMeeting entity) {
        if (entity == null) {
            return null;
        }

        // 작성자 정보 조회
        User author = userRepository.findById(entity.getAuthorIdx()).orElse(null);
        String authorDept = null;
        String authorDeptName = null;

        if (author != null && author.getEmpDept() != null) {
            authorDept = author.getEmpDept();
            authorDeptName = codeRepository.findByGroupCodeAndCode("C01", author.getEmpDept())
                    .map(Code::getCodeName)
                    .orElse(null);
        }

        // 참석자 목록 변환
        List<ReceiptMeetingAttendeeDTO> attendeeDTOs = entity.getAttendees() != null ?
                entity.getAttendees().stream()
                        .map(this::toAttendeeDTO)
                        .collect(Collectors.toList()) : null;

        // 결재선 목록 변환 (lazy loading 고려)
        List<ReceiptMeetingApprovalDTO> approvalDTOs = null;
        try {
            if (entity.getApprovals() != null) {
                approvalDTOs = entity.getApprovals().stream()
                        .map(this::toApprovalDTO)
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            // LazyInitializationException 등 무시
            approvalDTOs = null;
        }

        return ReceiptMeetingDTO.builder()
                .idx(entity.getIdx())
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProject() != null ? entity.getProject().getProjectName() : null)
                .documentNumber(entity.getDocumentNumber())
                .authorIdx(entity.getAuthorIdx())
                .authorName(entity.getAuthorName())
                .authorDept(authorDept)
                .authorDeptName(authorDeptName)
                .meetingDate(entity.getMeetingDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .location(entity.getLocation())
                .amount(entity.getAmount())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .paymentMethod(entity.getPaymentMethod())
                .notes(entity.getNotes())
                .minutesNotes(entity.getMinutesNotes())
                .status(entity.getStatus())
                .attendees(attendeeDTOs)
                .approvals(approvalDTOs)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * CreateDTO → Entity 변환
     */
    public ReceiptMeeting toEntity(ReceiptMeetingCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        return ReceiptMeeting.builder()
                .projectIdx(dto.getProjectIdx())
                .authorIdx(dto.getAuthorIdx())
                .authorName(dto.getAuthorName())
                .meetingDate(dto.getMeetingDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .location(dto.getLocation())
                .amount(dto.getAmount())
                .purpose(dto.getPurpose())
                .content(dto.getContent())
                .paymentMethod(dto.getPaymentMethod())
                .notes(dto.getNotes())
                .minutesNotes(dto.getMinutesNotes())
                .status("PENDING")
                .build();
    }

    /**
     * UpdateDTO로 Entity 업데이트
     */
    public void updateEntity(ReceiptMeeting entity, ReceiptMeetingUpdateDTO dto) {
        if (entity == null || dto == null) {
            return;
        }

        if (dto.getProjectIdx() != null) {
            entity.setProjectIdx(dto.getProjectIdx());
        }
        if (dto.getMeetingDate() != null) {
            entity.setMeetingDate(dto.getMeetingDate());
        }
        if (dto.getStartTime() != null) {
            entity.setStartTime(dto.getStartTime());
        }
        if (dto.getEndTime() != null) {
            entity.setEndTime(dto.getEndTime());
        }
        if (dto.getLocation() != null) {
            entity.setLocation(dto.getLocation());
        }
        if (dto.getAmount() != null) {
            entity.setAmount(dto.getAmount());
        }
        if (dto.getPurpose() != null) {
            entity.setPurpose(dto.getPurpose());
        }
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getPaymentMethod() != null) {
            entity.setPaymentMethod(dto.getPaymentMethod());
        }
        if (dto.getNotes() != null) {
            entity.setNotes(dto.getNotes());
        }
        if (dto.getMinutesNotes() != null) {
            entity.setMinutesNotes(dto.getMinutesNotes());
        }
    }

    /**
     * ReceiptMeetingAttendee Entity → DTO 변환
     */
    public ReceiptMeetingAttendeeDTO toAttendeeDTO(ReceiptMeetingAttendee entity) {
        if (entity == null) {
            return null;
        }
        String position = null;

        // attendee_type에 따라 직책 조회
        if ("내부".equals(entity.getAttendeeType()) && entity.getUserIdx() != null) {
            // 내부 참석자: User에서 직급명 조회
            position = userRepository.findById(entity.getUserIdx())
                    .map(user -> {
                        if (user.getEmpPosition() != null) {
                            return codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                                    .map(Code::getCodeName)
                                    .orElse(null);
                        }
                        return null;
                    })
                    .orElse(null);
        } else if ("외부".equals(entity.getAttendeeType()) && entity.getUserIdx() != null) {
            // 외부 참석자: ExternalPerson에서 직책 조회
            position = externalPersonRepository.findById(entity.getUserIdx())
                    .map(ExternalPerson::getPosition)
                    .orElse(null);
        }


        // 직책 정보가 없으면 원본 데이터에서 조회

            if ("내부".equals(entity.getAttendeeType()) && entity.getUserIdx() != null) {
                // 내부 참석자: User에서 직급명 조회
                userRepository.findById(entity.getUserIdx()).ifPresent(user -> {
                    if (user.getEmpPosition() != null) {
                        String positionName = codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                                .map(Code::getCodeName)
                                .orElse(null);

                    }
                });

            }


        return ReceiptMeetingAttendeeDTO.builder()
                .idx(entity.getIdx())
                .attendeeType(entity.getAttendeeType())
                .department(entity.getDepartment())
                .name(entity.getName())
                .userIdx(entity.getUserIdx())
                .position(position)
                .displayOrder(entity.getDisplayOrder())
                .build();
    }

    /**
     * ReceiptMeetingAttendeeDTO → Entity 변환
     */
    public ReceiptMeetingAttendee toAttendeeEntity(ReceiptMeetingAttendeeDTO dto, Long receiptMeetingIdx) {
        if (dto == null) {
            return null;
        }

        return ReceiptMeetingAttendee.builder()
                .receiptMeetingIdx(receiptMeetingIdx)
                .attendeeType(dto.getAttendeeType())
                .department(dto.getDepartment())
                .name(dto.getName())
                .userIdx(dto.getUserIdx())
                .displayOrder(dto.getDisplayOrder())
                .build();
    }

    /**
     * ReceiptMeetingApproval Entity → DTO 변환
     */
    public ReceiptMeetingApprovalDTO toApprovalDTO(ReceiptMeetingApproval entity) {
        if (entity == null) {
            return null;
        }

        // 결재자 정보 조회
        User approver = userRepository.findById(entity.getApproverIdx()).orElse(null);
        String approverName = null;
        String approverDept = null;
        String approverPosition = null;

        if (approver != null) {
            approverName = approver.getEmpName();

            // 부서명 조회
            if (approver.getEmpDept() != null) {
                approverDept = codeRepository.findByGroupCodeAndCode("C01", approver.getEmpDept())
                        .map(Code::getCodeName)
                        .orElse(null);
            }

            // 직급명 조회
            if (approver.getEmpPosition() != null) {
                approverPosition = codeRepository.findByGroupCodeAndCode("C02", approver.getEmpPosition())
                        .map(Code::getCodeName)
                        .orElse(null);
            }
        }

        return ReceiptMeetingApprovalDTO.builder()
                .idx(entity.getIdx())
                .approverIdx(entity.getApproverIdx())
                .approverName(approverName)
                .approverDept(approverDept)
                .approverPosition(approverPosition)
                .status(entity.getStatus())
                .approvedAt(entity.getApprovedAt())
                .build();
    }

    /**
     * 결재자 IDX → Entity 변환
     */
    public ReceiptMeetingApproval toApprovalEntity(Long approverIdx, Long receiptMeetingIdx) {
        if (approverIdx == null) {
            return null;
        }

        return ReceiptMeetingApproval.builder()
                .receiptMeetingIdx(receiptMeetingIdx)
                .approverIdx(approverIdx)
                .status("PENDING")
                .build();
    }
}
