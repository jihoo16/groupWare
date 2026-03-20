package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptPurchaseCreateDTO {
    private Long projectIdx;
    private Long cardIdx;
    private Long authorIdx;
    /** 'material' or 'equipment' */
    private String purchaseType;
    private LocalDate approvalDate;
    private String documentTitle;
    private String documentContent;
    /** 'card' or 'transfer' */
    private String paymentType;
    private BigDecimal totalAmount;
    private List<ReceiptPurchaseItemDTO> items;
}
