package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptPurchaseItemDTO {
    private Long idx;
    private Long receiptPurchaseIdx;
    private String itemDate;    // "yyyy-MM-dd" string
    private String itemDesc;
    private Integer quantity;
    private BigDecimal supplyAmount;
    private BigDecimal taxAmount;
    private String remark;
    private Integer sortOrder;
}
