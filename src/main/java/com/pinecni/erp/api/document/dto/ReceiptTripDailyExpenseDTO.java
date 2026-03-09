package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 연구비증빙 단독출장 일별 비용 명세 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripDailyExpenseDTO {

    /** 해당 날짜 */
    private LocalDate expenseDate;

    private BigDecimal transportationFee;
    private BigDecimal accommodationFee;
    private BigDecimal mealFee;
    private BigDecimal otherFee;
}
