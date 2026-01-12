package com.pinecni.erp.api.expense.dto;

import lombok.*;

/**
 * 지출 항목 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseDetailDTO {

    /**
     * 날짜 (YYYY-MM-DD)
     */
    private String expenseDate;

    /**
     * 적요
     */
    private String description;

    /**
     * 상호
     */
    private String shopName;

    /**
     * 금액
     */
    private Long amount;

    /**
     * 비고
     */
    private String note;
}
