package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDate;

/**
 * 지출 항목 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseDetailDTO {

    /** 지출 일자 (YYYY-MM-DD) */
    private LocalDate expenseDate;

    /** 적요 */
    private String description;

    /** 상호 */
    private String shopName;

    /** 결제수단 (개인카드 / 현금) */
    private String paymentMethod;

    /** 금액 */
    private Long amount;

    /** 비고 */
    private String note;
}
