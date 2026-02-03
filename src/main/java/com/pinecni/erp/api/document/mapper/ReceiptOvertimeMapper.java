package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttendeeDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeDTO;
import com.pinecni.erp.entity.ReceiptOvertime;
import com.pinecni.erp.entity.ReceiptOvertimeAttachment;
import com.pinecni.erp.entity.ReceiptOvertimeAttendee;
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
                .documentNumber(entity.getDocumentNumber())
                .documentIdx(entity.getDocumentIdx())
                .authorIdx(entity.getAuthorIdx())
                .cardIdx(entity.getCardIdx())
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
     * Entity -> DTO 변환 (attendees, attachments 포함)
     */
    public ReceiptOvertimeDTO toDTOWithDetails(ReceiptOvertime entity,
                                                java.util.List<ReceiptOvertimeAttendee> attendees,
                                                java.util.List<ReceiptOvertimeAttachment> attachments) {
        if (entity == null) {
            return null;
        }

        ReceiptOvertimeDTO dto = toDTO(entity);
        dto.setAttendees(attendees != null ?
                attendees.stream().map(this::toAttendeeDTO).collect(Collectors.toList()) :
                Collections.emptyList());
        dto.setAttachments(attachments != null ?
                attachments.stream().map(this::toAttachmentDTO).collect(Collectors.toList()) :
                Collections.emptyList());
        return dto;
    }

    /**
     * Attendee Entity -> AttendeeDTO 변환
     * 주의: userName은 Service 레이어에서 users 테이블 조인으로 설정 필요
     */
    public ReceiptOvertimeAttendeeDTO toAttendeeDTO(ReceiptOvertimeAttendee entity) {
        if (entity == null) {
            return null;
        }

        return ReceiptOvertimeAttendeeDTO.builder()
                .idx(entity.getIdx())
                .receiptOvertimeIdx(entity.getReceiptOvertimeIdx() != null ? entity.getReceiptOvertimeIdx().getId() : null)
                .userIdx(entity.getUserIdx())
                .workTime(entity.getWorkTime())
                .workTask(entity.getWorkTask())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
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
