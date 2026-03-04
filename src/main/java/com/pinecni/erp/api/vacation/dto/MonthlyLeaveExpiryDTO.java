package com.pinecni.erp.api.vacation.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * 월차 만료일별 FIFO 잔여 현황 DTO
 *
 * FIFO 원칙: 만료일이 이른 배치부터 사용일수를 소진한다고 가정.
 * remaining 의미:
 *   - expired=false : 아직 사용 가능한 잔여 일수
 *   - expired=true  : 미사용으로 소멸된 일수 (0이면 만료 전에 모두 사용)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyLeaveExpiryDTO {

    /** 만료일 (ISO, "2026-05-31") */
    private String expiryDate;

    /** 이 배치에서 발행된 총 일수 */
    private BigDecimal issued;

    /** FIFO 기준 사용 추정 일수 */
    private BigDecimal used;

    /**
     * 잔여 일수
     * - 유효 배치: 아직 사용할 수 있는 일수
     * - 소멸 배치: 미사용으로 소멸된 일수 (0이면 만료 전 모두 사용)
     */
    private BigDecimal remaining;

    /** 만료 여부 (expiryDate < 오늘) */
    private boolean expired;

    /** D-30 이내 만료 예정 여부 (expired=false 일 때만 의미 있음) */
    private boolean expiringSoon;
}
