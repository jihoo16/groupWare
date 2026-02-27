package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.externalperson.repository.ExternalPersonRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
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
        String authorUserName = null;
        String authorDept = null;
        String authorDeptName = null;

        if (author != null) {
            authorUserName = author.getEmpName();
            if (author.getEmpDept() != null) {
                authorDept = author.getEmpDept();
                authorDeptName = codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), author.getEmpDept())
                        .map(Code::getCodeName)
                        .orElse(null);
            }
        }

        // 참석자 목록 변환
        List<ReceiptMeetingAttendeeDTO> attendeeDTOs = entity.getAttendees() != null ?
                entity.getAttendees().stream()
                        .map(this::toAttendeeDTO)
                        .collect(Collectors.toList()) : null;

        // 첨부파일은 서비스에서 필요 시 DTO에 직접 세팅 (getReceiptMeetingById 전용)
        // 목록 조회에서 lazy load 방지를 위해 mapper에서는 접근하지 않음
        List<ReceiptMeetingAttachmentDTO> attachmentDTOs = null;

        // 카드 정보 조합
        String cardName = null;
        if (entity.getProjectCard() != null) {
            ProjectCard card = entity.getProjectCard();
            if (card.getCardNickname() != null && !card.getCardNickname().isEmpty()) {
                cardName = card.getCardNickname();
            } else if (card.getCardCompany() != null && card.getCardLastDigits() != null) {
                cardName = card.getCardCompany() + " (****" + card.getCardLastDigits() + ")";
            }
        }

        // 문서번호는 approval_documents 테이블에서 조회
        String documentNumber = null;
        if (entity.getApprovalDocument() != null) {
            documentNumber = entity.getApprovalDocument().getDocumentNo();
        }

        return ReceiptMeetingDTO.builder()
                .idx(entity.getIdx())
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProject() != null ? entity.getProject().getProjectName() : null)
                .cardIdx(entity.getCardIdx())
                .cardName(cardName)
                .documentNumber(documentNumber)
                .documentIdx(entity.getDocumentIdx())
                .authorIdx(entity.getAuthorIdx())
                .authorUserName(authorUserName)
                .authorDept(authorDept)
                .authorDeptName(authorDeptName)
                .meetingDate(entity.getMeetingDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .location(entity.getLocation())
                .amount(entity.getAmount())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .attendees(attendeeDTOs)
                .attachments(attachmentDTOs)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * ReceiptMeetingAttachment Entity → DTO 변환
     */
    public ReceiptMeetingAttachmentDTO toAttachmentDTO(ReceiptMeetingAttachment entity) {
        if (entity == null) return null;
        return ReceiptMeetingAttachmentDTO.builder()
                .idx(entity.getIdx())
                .receiptMeetingIdx(entity.getReceiptMeetingIdx())
                .originalFilename(entity.getOriginalFilename())
                .storedFilename(entity.getStoredFilename())
                .filePath(entity.getFilePath())
                .fileSize(entity.getFileSize())
                .fileType(entity.getFileType())
                .attachmentType(entity.getAttachmentType())
                .uploadUserIdx(entity.getUploadUserIdx())
                .uploadedAt(entity.getUploadedAt())
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
                .cardIdx(dto.getCardIdx())
                .authorIdx(dto.getAuthorIdx())
                .meetingDate(dto.getMeetingDate())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .location(dto.getLocation())
                .amount(dto.getAmount())
                .purpose(dto.getPurpose())
                .content(dto.getContent())
                .isDeleted(false)
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
        if (dto.getCardIdx() != null) {
            entity.setCardIdx(dto.getCardIdx());
        }
        if (dto.getAuthorIdx() != null) {
            entity.setAuthorIdx(dto.getAuthorIdx());
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
    }

    /**
     * ReceiptAttendee Entity → DTO 변환 (통합 테이블)
     */
    public ReceiptMeetingAttendeeDTO toAttendeeDTO(ReceiptAttendee entity) {
        if (entity == null) {
            return null;
        }

        String department = null;
        String name = null;
        String position = null;

        // isExternal에 따라 User 또는 ExternalPerson에서 정보 조회
        if (Boolean.FALSE.equals(entity.getIsExternal()) && entity.getUserIdx() != null) {
            // 내부 참석자: User에서 정보 조회
            User user = userRepository.findById(entity.getUserIdx()).orElse(null);
            if (user != null) {
                name = user.getEmpName();

                // 부서명 조회
                if (user.getEmpDept() != null) {
                    department = codeRepository.findByGroupCodeAndCode(
                            CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                            .map(Code::getCodeName)
                            .orElse(null);
                }

                // 직급명 조회
                if (user.getEmpPosition() != null) {
                    position = codeRepository.findByGroupCodeAndCode(
                            CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                            .map(Code::getCodeName)
                            .orElse(null);
                }
            }
        } else if (Boolean.TRUE.equals(entity.getIsExternal()) && entity.getUserIdx() != null) {
            // 외부 참석자: ExternalPerson에서 정보 조회
            ExternalPerson external = externalPersonRepository.findById(entity.getUserIdx()).orElse(null);
            if (external != null) {
                name = external.getName();
                department = external.getCompanyName(); // 외부인의 경우 회사명을 부서로
                position = external.getPosition();
            }
        }

        return ReceiptMeetingAttendeeDTO.builder()
                .idx(entity.getIdx())
                .isExternal(entity.getIsExternal())
                .department(department)
                .name(name)
                .userIdx(entity.getUserIdx())
                .position(position)
                .displayOrder(entity.getDisplayOrder())
                .meetingExpense(entity.getMeetingExpense())
                .build();
    }

    /**
     * ReceiptMeetingAttendeeDTO → ReceiptAttendee Entity 변환 (통합 테이블)
     * @param dto 참석자 DTO
     * @param meeting 회의록 Entity (projectIdx, cardIdx, meetingDate 등 추출용)
     * @param createdUserIdx 생성자 IDX
     */
    public ReceiptAttendee toAttendeeEntity(ReceiptMeetingAttendeeDTO dto, ReceiptMeeting meeting, Long createdUserIdx) {
        if (dto == null || meeting == null) {
            return null;
        }

        return ReceiptAttendee.builder()
                .documentTypePrefix("RCM") // 회의록 타입
                .receiptIdx(meeting.getIdx())
                .projectIdx(meeting.getProjectIdx())
                .cardIdx(meeting.getCardIdx())
                .userIdx(dto.getUserIdx())
                .isExternal(dto.getIsExternal() != null ? dto.getIsExternal() : false)
                .documentDate(meeting.getMeetingDate())
                .startTime(meeting.getStartTime())
                .endTime(meeting.getEndTime())
                .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
                .meetingExpense(dto.getMeetingExpense() != null ? dto.getMeetingExpense() : 0L)
                .createdUserIdx(createdUserIdx)
                .isDeleted(false)
                .build();
    }

    /**
     * ReceiptMeetingAttendeeDTO → ReceiptAttendee Entity 변환 (receiptIdx 직접 전달용)
     * @param dto 참석자 DTO
     * @param receiptIdx 회의록 IDX
     * @param projectIdx 프로젝트 IDX
     * @param cardIdx 카드 IDX
     * @param documentDate 회의 날짜
     * @param startTime 시작 시간
     * @param endTime 종료 시간
     * @param createdUserIdx 생성자 IDX
     */
    public ReceiptAttendee toAttendeeEntity(
            ReceiptMeetingAttendeeDTO dto,
            Long receiptIdx,
            Long projectIdx,
            Long cardIdx,
            java.time.LocalDate documentDate,
            java.time.LocalTime startTime,
            java.time.LocalTime endTime,
            Long createdUserIdx) {

        if (dto == null) {
            return null;
        }

        return ReceiptAttendee.builder()
                .documentTypePrefix("RCM") // 회의록 타입
                .receiptIdx(receiptIdx)
                .projectIdx(projectIdx)
                .cardIdx(cardIdx)
                .userIdx(dto.getUserIdx())
                .isExternal(dto.getIsExternal() != null ? dto.getIsExternal() : false)
                .documentDate(documentDate)
                .startTime(startTime)
                .endTime(endTime)
                .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
                .meetingExpense(dto.getMeetingExpense() != null ? dto.getMeetingExpense() : 0L)
                .createdUserIdx(createdUserIdx)
                .isDeleted(false)
                .build();
    }

}
