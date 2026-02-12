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
    private String empDept;          // 부서 코드
    private String empDeptName;      // 부서명 (한글)
    private String empPosition;      // 직급 코드
    private String empPositionName;  // 직급명 (한글)
    private String empAddress;
    private String empBirth;
    private String empPhone;
    private String empJoinDate;      // 입사일
    private Integer empPositionSortOrder; // 직급 정렬 순서

    // 연차 정보
    private BigDecimal totalDays;
    private BigDecimal usedDays;
    private BigDecimal remainingDays;
    private Integer year;
}
