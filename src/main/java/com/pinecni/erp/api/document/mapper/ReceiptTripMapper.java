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
     * ReceiptTripAttendee Entity → DTO 변환
     */
    public ReceiptTripAttendeeDTO toAttendeeDTO(ReceiptTripAttendee entity) {
        if (entity == null) return null;

        String position = null;
        if (entity.getUserIdx() != null) {
            position = userRepository.findById(entity.getUserIdx())
                    .map(user -> {
                        if (user.getEmpPosition() != null) {
                            return codeRepository
                                    .findByGroupCodeAndCode(CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                                    .map(Code::getCodeName)
                                    .orElse(null);
                        }
                        return null;
                    })
                    .orElse(null);
        }

        return ReceiptTripAttendeeDTO.builder()
                .idx(entity.getIdx())
                .department(entity.getDepartment())
                .name(entity.getName())
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
     * ReceiptTripAttendeeDTO → Entity 변환
     */
    public ReceiptTripAttendee toAttendeeEntity(ReceiptTripAttendeeDTO dto, Long receiptTripIdx) {
        if (dto == null) return null;

        return ReceiptTripAttendee.builder()
                .receiptTripIdx(receiptTripIdx)
                .department(dto.getDepartment())
                .name(dto.getName())
                .userIdx(dto.getUserIdx())
                .displayOrder(dto.getDisplayOrder())
                .build();
    }
}
