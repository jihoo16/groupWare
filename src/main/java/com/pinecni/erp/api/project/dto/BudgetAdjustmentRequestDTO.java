package com.pinecni.erp.api.project.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BudgetAdjustmentRequestDTO {
    /** 예산 구분: ACTIVITY / EQUIPMENT / MATERIAL */
    private String budgetType;
    /** 프론트에서 (입력잔액 - (총액 - 사용액))으로 계산한 보정액 */
    private BigDecimal adjustmentAmount;
    /** 보정 사유 (필수) */
    private String reason;
}
