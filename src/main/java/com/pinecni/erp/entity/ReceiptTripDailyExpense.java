package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 연구비증빙 단독출장 일별 비용 명세 Entity
 * (receipt_trip_daily_expense 테이블)
 *
 * - 출장 기간 동안 날짜(expense_date)별로 비용 항목을 기록한다.
 * - 당일 출장(duration=0)은 1개 row만 저장.
 * - 부모 테이블(receipt_trip)의 total_fee 는 이 테이블 전 항목 합산 캐시다.
 */
@Entity
@Table(name = "receipt_trip_daily_expense", schema = "erp", indexes = {
        @Index(name = "idx_rct_daily_expense_rct", columnList = "receipt_trip_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripDailyExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_daily_expense_seq")
    @SequenceGenerator(name = "receipt_trip_daily_expense_seq",
                       sequenceName = "erp.receipt_trip_daily_expense_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_trip_idx", nullable = false)
    private Long receiptTripIdx;

    /** 해당 날짜 */
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Builder.Default
    @Column(name = "transportation_fee", precision = 15, scale = 2)
    private BigDecimal transportationFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "accommodation_fee", precision = 15, scale = 2)
    private BigDecimal accommodationFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "meal_fee", precision = 15, scale = 2)
    private BigDecimal mealFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "other_fee", precision = 15, scale = 2)
    private BigDecimal otherFee = BigDecimal.ZERO;

    // ─── 관계 매핑 ──────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_trip_idx", insertable = false, updatable = false)
    private ReceiptTrip receiptTrip;
}
