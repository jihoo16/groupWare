package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttendeeDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeDTO;
import com.pinecni.erp.entity.ReceiptOvertime;
import com.pinecni.erp.entity.ReceiptOvertimeAttachment;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.stream.Collectors;

/**
 * 야근식대 Entity-DTO 변환 Mapper
 */
@Component
public class ReceiptOvertimeMapper {

    /**
     * Entity -> DTO 변환
     * 주의: authorUserName은 Service 레이어에서 users 테이블 조인으로 설정 필요
     */
    public ReceiptOvertimeDTO toDTO(ReceiptOvertime entity) {
        if (entity == null) {
            return null;
        }

        return ReceiptOvertimeDTO.builder()
                .idx(entity.getId())
                .projectIdx(entity.getProjectIdx() != null ? entity.getProjectIdx().getIdx() : null)
                .projectName(entity.getProjectIdx() != null ? entity.getProjectIdx().getProjectName() : null)
                .cardIdx(entity.getCardIdx())
                .documentNumber(entity.getDocumentNumber())
                .documentIdx(entity.getDocumentIdx())
                .authorIdx(entity.getAuthorIdx())
                .overtimeDate(entity.getOvertimeDate())
                .approvalDate(entity.getApprovalDate())
                .documentTitle(entity.getDocumentTitle())
                .documentContent(entity.getDocumentContent())
                .totalAmount(entity.getTotalAmount())
                .paymentType(entity.getPaymentType())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * Entity -> DTO 변환 (attendees DTO 리스트, attachments 포함)
     * receipt_attendee 테이블에서 변환된 DTO 사용
     */
    public ReceiptOvertimeDTO toDTOWithDetails(ReceiptOvertime entity,
                                                java.util.List<ReceiptOvertimeAttendeeDTO> attendeeDTOs,
                                                java.util.List<ReceiptOvertimeAttachment> attachments) {
        if (entity == null) {
            return null;
        }

        ReceiptOvertimeDTO dto = toDTO(entity);
        dto.setAttendees(attendeeDTOs != null ? attendeeDTOs : Collections.emptyList());
        dto.setAttachments(attachments != null ?
                attachments.stream().map(this::toAttachmentDTO).collect(Collectors.toList()) :
                Collections.emptyList());
        return dto;
    }

    /**
     * Attachment Entity -> AttachmentDTO 변환
     */
    public ReceiptOvertimeAttachmentDTO toAttachmentDTO(ReceiptOvertimeAttachment entity) {
        if (entity == null) {
            return null;
        }

        return ReceiptOvertimeAttachmentDTO.builder()
                .idx(entity.getId())
                .receiptOvertimeIdx(entity.getReceiptOvertimeIdx() != null ? entity.getReceiptOvertimeIdx().getId() : null)
                .originalFilename(entity.getOriginalFilename())
                .savingFilename(entity.getSavingFilename())
                .filePath(entity.getFilePath())
                .fileSize(entity.getFileSize())
                .fileType(entity.getFileType())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
