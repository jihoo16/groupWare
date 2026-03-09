package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 연구비증빙 출장+회의 일별 비용 명세 Entity
 * (receipt_trip_meeting_daily_expense 테이블)
 *
 * - 출장 기간 동안 날짜(expense_date)별로 비용 항목을 기록한다.
 * - 당일 출장(duration=0)은 1개 row만 저장.
 * - 부모 테이블(receipt_trip_meeting)의 total_fee 는 이 테이블 전 항목 합산의 SUM 캐시다.
 */
@Entity
@Table(name = "receipt_trip_meeting_daily_expense", schema = "erp", indexes = {
        @Index(name = "idx_rtm_daily_expense_rtm", columnList = "receipt_trip_meeting_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripMeetingDailyExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_meeting_daily_expense_seq")
    @SequenceGenerator(name = "receipt_trip_meeting_daily_expense_seq",
                       sequenceName = "erp.receipt_trip_meeting_daily_expense_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_trip_meeting_idx", nullable = false)
    private Long receiptTripMeetingIdx;

    /** 해당 날짜 */
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Builder.Default
    @Column(name = "transportation_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal transportationFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "accommodation_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal accommodationFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "meal_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal mealFee = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "other_fee", nullable = false, precision = 15, scale = 2)
    private BigDecimal otherFee = BigDecimal.ZERO;

    // ─── 관계 매핑 ──────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_trip_meeting_idx", insertable = false, updatable = false)
    private ReceiptTripMeeting receiptTripMeeting;

}
