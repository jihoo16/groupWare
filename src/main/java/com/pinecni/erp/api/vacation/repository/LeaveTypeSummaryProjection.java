package com.pinecni.erp.api.vacation.repository;

import java.math.BigDecimal;

/**
 * vacation_accrual_schedule 테이블에서 연차 타입별 발생일수를 한 번에 집계하기 위한 프로젝션.
 * 기존 개별 SUM 쿼리 4개(sumAnnualLeaveDays, sumProportionalDays, sumCompensatoryDays, sumValidMonthlyDays)를
 * 단일 CASE WHEN 쿼리로 통합.
 */
public interface LeaveTypeSummaryProjection {

    BigDecimal getAnnualLeaveDays();

    BigDecimal getProportionalDays();

    BigDecimal getCompensatoryDays();

    BigDecimal getValidMonthlyDays();
}
