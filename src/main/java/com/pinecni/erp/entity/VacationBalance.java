package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Subselect;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 연차 잔액 VIEW (읽기 전용)
 * - vacation_accrual_schedule과 vacation_request를 조인하여 실시간 계산
 * - 오늘까지 발생한 연차(accrual_date <= CURRENT_DATE)만 집계
 * - 읽기 전용 (Immutable)
 * - 데이터 불일치 방지를 위해 VIEW로 구현
 */
@Entity
@Immutable
@Subselect("SELECT * FROM erp.vacation_balance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VacationBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "total_days", nullable = false, precision = 4, scale = 1)
    private BigDecimal totalDays = new BigDecimal("15.0");

    @Column(name = "used_days", nullable = false, precision = 4, scale = 1)
    private BigDecimal usedDays = BigDecimal.ZERO;

    @Column(name = "remaining_days", nullable = false, precision = 4, scale = 1)
    private BigDecimal remainingDays = new BigDecimal("15.0");

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // 관계 매핑
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
