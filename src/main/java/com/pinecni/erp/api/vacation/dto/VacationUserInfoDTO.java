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

    // 입사 전 연도 조회 여부 (true이면 연차 데이터 없음)
    private boolean preEmployment;

    // 연차 정보 (vacation_balance 기반)
    private Integer year;
    private BigDecimal totalDays;        // 부여일수 (grantedDays)
    private BigDecimal usedDays;         // 사용 연차
    private BigDecimal remainingDays;    // 잔여 연차

    // 상세 breakdown
    private BigDecimal annualLeaveDays;    // 1년초과연차 (기본연차 + 근속가산)
    private BigDecimal monthlyLeaveDays;   // 유효 월차
    private BigDecimal proportionalDays;   // 비례연차
    private BigDecimal compensatoryDays;   // 보상휴가
    private BigDecimal expiredMonthlyDays; // 소멸 월차
    private BigDecimal earlyUseDays;       // 조기사용연차 (마이너스연차)

    // 다음 발생 예정 (YY/MM/DD 지나면 nn개)
    private String     nextAccrualDate;  // "2026-03-15"
    private BigDecimal nextAccrualDays;
    private String     nextAccrualType;
    private String     nextAccrualDesc;
}
