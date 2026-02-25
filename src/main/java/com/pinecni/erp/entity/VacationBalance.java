package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 연차 잔액 요약 Entity (vacation_balance 테이블)
 *
 * vacation_accrual_schedule + vacation_request 를 집계한 결과를 저장.
 * 스케줄러가 매일 갱신, 연차 신청/취소 시 즉시 갱신.
 * 사람당 연도당 1행.
 *
 * [컬럼 구조]
 * 발생: granted = annual + monthly + proportional + compensatory
 * 차감: expired_monthly (소멸), early_use (조기사용), used (사용)
 * 잔여: remaining = (granted - expired_monthly) - used
 */
@Entity
@Table(name = "vacation_balance", schema = "erp",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_vacation_balance",
                columnNames = {"user_idx", "year"}
        ),
        indexes = {
                @Index(name = "idx_vb_user_year", columnList = "user_idx, year"),
                @Index(name = "idx_vb_year",      columnList = "year")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vacation_balance_sequence")
    @SequenceGenerator(name = "vacation_balance_sequence", sequenceName = "erp.vacation_balance_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "year", nullable = false)
    private Integer year;

    // ── 발생 (Granted) ────────────────────────────────────────────────────

    /** 부여일수: 현재 시점 기준 유효한 모든 연차 합계 (= annual + monthly + proportional + compensatory) */
    @Column(name = "granted_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal grantedDays = BigDecimal.ZERO;

    /** 1년초과연차: 기본연차(15일) + 근속가산 합계 */
    @Column(name = "annual_leave_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal annualLeaveDays = BigDecimal.ZERO;

    /** 월차: 해당 연도에 발생한 월차 중 소멸되지 않은 것 */
    @Column(name = "monthly_leave_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal monthlyLeaveDays = BigDecimal.ZERO;

    /** 비례연차: 1주년 도래 연도에 발생 */
    @Column(name = "proportional_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal proportionalDays = BigDecimal.ZERO;

    /** 보상휴가: 만 10년 근속 시 5일 (1회한) */
    @Column(name = "compensatory_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal compensatoryDays = BigDecimal.ZERO;

    // ── 차감 항목 ──────────────────────────────────────────────────────────

    /** 소멸 월차: 만료일 경과로 소멸된 월차 합계 (이력 보존용) */
    @Column(name = "expired_monthly_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal expiredMonthlyDays = BigDecimal.ZERO;

    /** 조기사용연차: (granted - expired_monthly) 보다 used 가 많을 때의 초과분 (1년 미만 직원) */
    @Column(name = "early_use_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal earlyUseDays = BigDecimal.ZERO;

    /** 사용 연차: vacation_request 기준 해당 연도 사용분 */
    @Column(name = "used_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal usedDays = BigDecimal.ZERO;

    // ── 잔여 ──────────────────────────────────────────────────────────────

    /** 잔여 = (granted - expired_monthly) - used. 음수 가능 (조기사용 시) */
    @Column(name = "remaining_days", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal remainingDays = BigDecimal.ZERO;

    // ── 다음 발생 예정 ─────────────────────────────────────────────────────

    /** 다음 연차 발생 예정일 (화면: "YY/MM/DD 지나면 nn개") */
    @Column(name = "next_accrual_date")
    private LocalDate nextAccrualDate;

    /** 다음 발생 예정 일수 */
    @Column(name = "next_accrual_days", precision = 5, scale = 1)
    private BigDecimal nextAccrualDays;

    /** 다음 발생 타입 (월차 / 근속가산 / 보상휴가 등) */
    @Column(name = "next_accrual_type", length = 40)
    private String nextAccrualType;

    /** 다음 발생 설명 (예: "만 3년 근속 가산 +1일") */
    @Column(name = "next_accrual_desc", length = 200)
    private String nextAccrualDesc;

    // ── 메타 ──────────────────────────────────────────────────────────────

    /** 마지막 계산 시각 */
    @Column(name = "last_calculated_at", nullable = false)
    private LocalDateTime lastCalculatedAt;

    @PrePersist
    protected void onCreate() {
        if (lastCalculatedAt == null) {
            lastCalculatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        lastCalculatedAt = LocalDateTime.now();
    }
}
