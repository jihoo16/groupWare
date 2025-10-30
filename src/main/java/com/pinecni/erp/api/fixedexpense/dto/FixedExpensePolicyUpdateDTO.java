package com.pinecni.erp.api.fixedexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 직급별 고정경비 정책 수정 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FixedExpensePolicyUpdateDTO {

    private String positionCode;
    private Integer lunchAllowance;
    private Integer nightMealAllowance;
    private Integer businessMealAllowance;
    private Integer businessTripAllowance;
    private Integer transitAllowance;
    private Integer fuelAllowance;
    private Integer holidayExpense;
    private Integer beverageExpense;
}
