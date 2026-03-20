package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.document.dto.ReceiptPurchaseAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseItemDTO;
import com.pinecni.erp.entity.ReceiptPurchase;
import com.pinecni.erp.entity.ReceiptPurchaseAttachment;
import com.pinecni.erp.entity.ReceiptPurchaseItem;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ReceiptPurchaseMapper {

    public ReceiptPurchaseDTO toDTO(ReceiptPurchase entity) {
        if (entity == null) return null;
        return ReceiptPurchaseDTO.builder()
                .idx(entity.getIdx())
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProject() != null ? entity.getProject().getProjectName() : null)
                .cardIdx(entity.getCardIdx())
                .documentIdx(entity.getDocumentIdx())
                .authorIdx(entity.getAuthorIdx())
                .purchaseType(entity.getPurchaseType())
                .approvalDate(entity.getApprovalDate())
                .documentTitle(entity.getDocumentTitle())
                .documentContent(entity.getDocumentContent())
                .paymentType(entity.getPaymentType())
                .totalAmount(entity.getTotalAmount())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ReceiptPurchaseDTO toDTOWithDetails(ReceiptPurchase entity,
                                               List<ReceiptPurchaseItem> items,
                                               List<ReceiptPurchaseAttachment> attachments) {
        if (entity == null) return null;
        ReceiptPurchaseDTO dto = toDTO(entity);
        dto.setItems(items != null
                ? items.stream().map(this::toItemDTO).collect(Collectors.toList())
                : Collections.emptyList());
        dto.setAttachments(attachments != null
                ? attachments.stream().map(this::toAttachmentDTO).collect(Collectors.toList())
                : Collections.emptyList());
        return dto;
    }

    public ReceiptPurchaseItemDTO toItemDTO(ReceiptPurchaseItem item) {
        if (item == null) return null;
        return ReceiptPurchaseItemDTO.builder()
                .idx(item.getIdx())
                .receiptPurchaseIdx(item.getReceiptPurchaseIdx())
                .itemDate(item.getItemDate() != null ? item.getItemDate().toString() : null)
                .itemDesc(item.getItemDesc())
                .quantity(item.getQuantity())
                .supplyAmount(item.getSupplyAmount())
                .taxAmount(item.getTaxAmount())
                .remark(item.getRemark())
                .sortOrder(item.getSortOrder())
                .build();
    }

    public ReceiptPurchaseAttachmentDTO toAttachmentDTO(ReceiptPurchaseAttachment entity) {
        if (entity == null) return null;
        return ReceiptPurchaseAttachmentDTO.builder()
                .idx(entity.getIdx())
                .receiptPurchaseIdx(entity.getReceiptPurchaseIdx())
                .originalFilename(entity.getOriginalFilename())
                .storedFilename(entity.getStoredFilename())
                .filePath(entity.getFilePath())
                .fileSize(entity.getFileSize())
                .fileType(entity.getFileType())
                .attachmentType(entity.getAttachmentType())
                .uploadUserIdx(entity.getUploadUserIdx())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
