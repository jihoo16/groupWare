package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 직급별 고정경비 정책 DTO
 * 전체 정보 조회 및 응답용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FixedExpensePolicyDTO {

    private Long idx;
    private String positionCode;
    private String positionName;
    private Integer lunchAllowance;
    private Integer nightMealAllowance;
    private Integer businessMealAllowance;
    private Integer businessTripAllowance;
    private Integer transitAllowance;
    private Integer fuelAllowance;
    private Integer holidayExpense;
    private Integer beverageExpense;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdUserIdx;
    private Long updatedUserIdx;
}
