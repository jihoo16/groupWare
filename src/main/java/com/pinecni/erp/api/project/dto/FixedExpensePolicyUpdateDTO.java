package com.pinecni.erp.api.project.dto;

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
    private String expenseItemName;
    private String expenseItemNameEn;
    private Integer amount;
}
