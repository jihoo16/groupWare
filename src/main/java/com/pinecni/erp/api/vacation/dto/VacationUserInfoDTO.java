package com.pinecni.erp.api.vacation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 연차 신청서용 사용자 정보 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationUserInfoDTO {
    private Long userIdx;
    private String empName;
    private String empDept;
    private String empPosition;
    private String empAddress;
    private String empBirth;
    private String empPhone;
    
    // 연차 정보
    private BigDecimal totalDays;
    private BigDecimal usedDays;
    private BigDecimal remainingDays;
    private Integer year;
}
