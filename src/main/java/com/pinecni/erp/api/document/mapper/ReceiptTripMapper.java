package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.document.dto.*;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ReceiptTrip Entity ↔ DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class ReceiptTripMapper {

    private final UserRepository userRepository;
    private final CodeRepository codeRepository;

    /**
     * Entity → DTO 변환
     */
    public ReceiptTripDTO toDTO(ReceiptTrip entity) {
        if (entity == null) return null;

        // 작성자 정보 조회
        User author = userRepository.findById(entity.getDrafterUserIdx()).orElse(null);
        String authorUserName = null;
        String authorDept     = null;
        String authorDeptName = null;

        if (author != null) {
            authorUserName = author.getEmpName();
            if (author.getEmpDept() != null) {
                authorDept     = author.getEmpDept();
                authorDeptName = codeRepository
                        .findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), author.getEmpDept())
                        .map(Code::getCodeName)
                        .orElse(null);
            }
        }

        // 카드명 조회
        String cardName = null;
        if (entity.getProjectCard() != null) {
            ProjectCard card = entity.getProjectCard();
            if (card.getCardNickname() != null && !card.getCardNickname().isEmpty()) {
                cardName = card.getCardNickname();
            } else if (card.getCardCompany() != null && card.getCardLastDigits() != null) {
                cardName = card.getCardCompany() + " (****" + card.getCardLastDigits() + ")";
            }
        }

        // 참석자 목록 변환
        List<ReceiptTripAttendeeDTO> attendeeDTOs = entity.getAttendees() != null
                ? entity.getAttendees().stream().map(this::toAttendeeDTO).collect(Collectors.toList())
                : null;

        // 문서번호: entity 자체 필드 우선, 없으면 연관된 ApprovalDocument에서 조회
        String documentNumber = entity.getDocumentNumber();
        if (documentNumber == null && entity.getApprovalDocument() != null) {
            documentNumber = entity.getApprovalDocument().getDocumentNo();
        }

        return ReceiptTripDTO.builder()
                .idx(entity.getIdx())
                .documentIdx(entity.getDocumentIdx())
                .documentNumber(documentNumber)
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProject() != null ? entity.getProject().getProjectName() : null)
                .cardIdx(entity.getCardIdx())
                .cardName(cardName)
                .drafterUserIdx(entity.getDrafterUserIdx())
                .authorUserName(authorUserName)
                .authorDept(authorDept)
                .authorDeptName(authorDeptName)
                .tripDate(entity.getTripDate())
                .duration(entity.getDuration())
                .location(entity.getLocation())
                .totalFee(entity.getTotalFee())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .attendees(attendeeDTOs)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * CreateDTO → Entity 변환
     */
    public ReceiptTrip toEntity(ReceiptTripCreateDTO dto) {
        if (dto == null) return null;

        BigDecimal totalFee = sumFees(dto.getTransportationFee(), dto.getAccommodationFee(),
                dto.getMealFee(), dto.getOtherFee());

        return ReceiptTrip.builder()
                .projectIdx(dto.getProjectIdx())
                .cardIdx(dto.getCardIdx())
                .drafterUserIdx(dto.getDrafterUserIdx())
                .tripDate(dto.getTripDate())
                .duration(dto.getDuration())
                .location(dto.getLocation())
                .totalFee(totalFee)
                .purpose(dto.getPurpose())
                .content(dto.getContent())
                .deleted(false)
                .build();
    }

    /**
     * UpdateDTO로 Entity 필드 업데이트
     */
    public void updateEntity(ReceiptTrip entity, ReceiptTripUpdateDTO dto) {
        if (entity == null || dto == null) return;

        if (dto.getProjectIdx() != null) entity.setProjectIdx(dto.getProjectIdx());
        if (dto.getCardIdx() != null)    entity.setCardIdx(dto.getCardIdx());
        if (dto.getTripDate() != null)   entity.setTripDate(dto.getTripDate());
        if (dto.getDuration() != null)   entity.setDuration(dto.getDuration());
        if (dto.getLocation() != null)   entity.setLocation(dto.getLocation());
        if (dto.getPurpose() != null)    entity.setPurpose(dto.getPurpose());
        if (dto.getContent() != null)    entity.setContent(dto.getContent());

        // 개별 항목이 하나라도 넘어오면 totalFee 재계산
        if (dto.getTransportationFee() != null || dto.getAccommodationFee() != null
                || dto.getMealFee() != null || dto.getOtherFee() != null) {
            entity.setTotalFee(sumFees(dto.getTransportationFee(), dto.getAccommodationFee(),
                    dto.getMealFee(), dto.getOtherFee()));
        }
    }

    /**
     * ReceiptTripAttachment Entity → DTO 변환
     */
    public ReceiptTripAttachmentDTO toAttachmentDTO(ReceiptTripAttachment entity) {
        if (entity == null) return null;

        return ReceiptTripAttachmentDTO.builder()
                .idx(entity.getIdx())
                .receiptTripIdx(entity.getReceiptTripIdx())
                .originalFilename(entity.getOriginalFilename())
                .storedFilename(entity.getStoredFilename())
                .filePath(entity.getFilePath())
                .fileSize(entity.getFileSize())
                .fileType(entity.getFileType())
                .attachmentType(entity.getAttachmentType())
                .uploadUserIdx(entity.getUploadUserIdx())
                .uploadedAt(entity.getUploadedAt())
                .createdAt(entity.getCreatedAt())
                .deleted(entity.getDeleted())
                .deletedAt(entity.getDeletedAt())
                .build();
    }

    /**
     * ReceiptAttendee Entity → DTO 변환 (RCT 전용)
     */
    public ReceiptTripAttendeeDTO toAttendeeDTO(ReceiptAttendee entity) {
        if (entity == null) return null;

        String name       = null;
        String department = null;
        String position   = null;

        if (entity.getUserIdx() != null) {
            User user = userRepository.findById(entity.getUserIdx()).orElse(null);
            if (user != null) {
                name       = user.getEmpName();
                department = user.getEmpDept();
                if (user.getEmpPosition() != null) {
                    position = codeRepository
                            .findByGroupCodeAndCode(CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                            .map(Code::getCodeName)
                            .orElse(null);
                }
            }
        }

        return ReceiptTripAttendeeDTO.builder()
                .idx(entity.getIdx())
                .department(department)
                .name(name)
                .userIdx(entity.getUserIdx())
                .position(position)
                .displayOrder(entity.getDisplayOrder())
                .build();
    }

    private BigDecimal sumFees(BigDecimal... fees) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal fee : fees) {
            if (fee != null) total = total.add(fee);
        }
        return total;
    }

    /**
     * ReceiptTripAttendeeDTO → ReceiptAttendee Entity 변환 (RCT 전용)
     *
     * @param dto             참석자 DTO
     * @param trip            저장된 ReceiptTrip 엔티티 (documentDate, projectIdx, cardIdx 출처)
     * @param currentUserIdx  저장자 IDX (createdUserIdx)
     */
    public ReceiptAttendee toAttendeeEntity(ReceiptTripAttendeeDTO dto, ReceiptTrip trip, Long currentUserIdx) {
        if (dto == null) return null;

        return ReceiptAttendee.builder()
                .documentTypePrefix("RCT")
                .receiptIdx(trip.getIdx())
                .projectIdx(trip.getProjectIdx())
                .cardIdx(trip.getCardIdx())
                .documentDate(trip.getTripDate())
                .userIdx(dto.getUserIdx())
                .isExternal(false)
                .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
                .createdUserIdx(currentUserIdx)
                .isDeleted(false)
                .build();
    }
}
