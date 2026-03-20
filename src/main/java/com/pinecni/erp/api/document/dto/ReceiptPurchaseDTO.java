package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptPurchaseDTO {
    private Long idx;
    private Long projectIdx;
    private String projectName;
    private Long cardIdx;
    private Long documentIdx;
    private Long authorIdx;
    private String authorUserName;
    private String purchaseType;
    private LocalDate approvalDate;
    private String documentTitle;
    private String documentContent;
    private String paymentType;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<ReceiptPurchaseItemDTO> items;
    private List<ReceiptPurchaseAttachmentDTO> attachments;
}
