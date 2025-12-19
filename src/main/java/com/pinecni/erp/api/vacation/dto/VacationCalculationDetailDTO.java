package com.pinecni.erp.api.vacation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 연차 계산 상세 정보 DTO
 * - 총 연차 모달에서 사용
 * - 입사 첫해: 월차 계산 상세
 * - 일반: 기본 연차 + 근속가산 연차 상세
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationCalculationDetailDTO {

    // 기본 정보
    private String joinDate;              // 입사일 (yyyy-MM-dd)
    private String calculationBaseDate;   // 계산 기준일 (yyyy-MM-dd)
    private Integer year;                 // 대상 연도
    private Integer yearsOfService;       // 근속 연수
    private Integer monthsOfService;      // 근속 개월 수
    private Boolean isFirstYear;          // 입사 첫해 여부

    // 일반 연차 계산 (1년 이상 근속자)
    private BigDecimal baseVacationDays;      // 기본 연차 (15일 또는 비례)
    private BigDecimal serviceBonusDays;      // 근속가산 연차 (만 2년마다 1일)
    private String serviceBonusAccrualDate;   // 근속연차 발생 예정일 (yyyy-MM-dd)
    private String serviceBonusDescription;   // 근속연차 설명 (예: "만 2년 근속 가산")

    // 월차 계산 (입사 첫해)
    private BigDecimal monthlyVacationDays;   // 월차 총 일수
    private Integer monthlyStartMonth;        // 월차 시작 월
    private Integer monthlyEndMonth;          // 월차 종료 월

    // 비례 연차 (1년 초과하는 해)
    private BigDecimal proportionalVacationDays;  // 비례 연차 일수
    private String proportionalStartDate;         // 비례 연차 시작일 (1년일)

    // 총 연차
    private BigDecimal totalVacationDays;     // 총 연차 일수
}
