package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 연차 잔여 현황 Entity
 */
@Entity
@Table(name = "vacation_balances", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_idx", "year"}),
        indexes = {
                @Index(name = "idx_vb_user", columnList = "user_idx"),
                @Index(name = "idx_vb_year", columnList = "year")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vacation_balances_sequence")
    @SequenceGenerator(name = "vacation_balances_sequence", sequenceName = "erp.vacation_balances_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "total_days", nullable = false)
    private Integer totalDays = 15;

    @Column(name = "used_days", nullable = false, columnDefinition = "integer default 0")
    private Integer usedDays = 0;

    @Column(name = "remaining_days", nullable = false)
    private Integer remainingDays = 15;

    @Column(name = "granted_date")
    private LocalDate grantedDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;
}
