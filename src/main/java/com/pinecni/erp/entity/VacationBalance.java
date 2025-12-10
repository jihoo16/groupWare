package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 연차 잔여 현황 Entity
 */
@Entity
@Table(name = "vacation_balance", schema = "erp",
        uniqueConstraints = @UniqueConstraint(name = "uq_vacation_balance_user_year", columnNames = {"user_idx", "year"}),
        indexes = {
                @Index(name = "idx_vacation_balance_user_idx", columnList = "user_idx")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vacation_balance_sequence")
    @SequenceGenerator(name = "vacation_balance_sequence", sequenceName = "vacation_balance_sequence", allocationSize = 1)
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
