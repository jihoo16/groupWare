package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 연차 발생 일정 Entity
 * 매일 스케줄러가 실행되어 오늘 발생해야 할 연차를 INSERT
 */
@Entity
@Table(name = "vacation_accrual_schedule", schema = "erp",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_vacation_accrual",
                columnNames = {"user_idx", "year", "accrual_date", "accrual_type"}
        ),
        indexes = {
                @Index(name = "idx_vacation_accrual_user_year", columnList = "user_idx, year"),
                @Index(name = "idx_vacation_accrual_date", columnList = "accrual_date"),
                @Index(name = "idx_vacation_accrual_type", columnList = "accrual_type"),
                @Index(name = "idx_vacation_accrual_user_year_date", columnList = "user_idx, year, accrual_date")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VacationAccrualSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "year", nullable = false)
    private Integer year;

    /**
     * 연차 발생일
     * - BASE: 1월 1일
     * - SENIORITY: 입사일 기준 만 2년, 4년, 6년...
     * - MONTHLY: 입사월+1일, +2일... (매월 입사일)
     * - PROPORTIONAL: 1년일 (1년 초과하는 해)
     */
    @Column(name = "accrual_date", nullable = false)
    private LocalDate accrualDate;

    /**
     * 발생 타입
     * - BASE: 기본 15일 (1년 이상 근속자, 1/1 발생)
     * - SENIORITY: 근속가산 (만 2년마다 1일, 최대 10일)
     * - MONTHLY: 월차 (1년 미만, 매월 만근 후 발생)
     * - PROPORTIONAL: 비례 연차 (1년 초과하는 해, 1년일~12/31 비례)
     */
    @Column(name = "accrual_type", nullable = false, length = 20)
    private String accrualType;

    @Column(name = "days", nullable = false, precision = 4, scale = 1)
    private BigDecimal days = BigDecimal.ZERO;

    /**
     * 발생 사유 설명
     * 예: "기본 연차 15일", "만 2년 근속 가산", "9월 만근 월차"
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // 메타 정보
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    // 관계 매핑
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // 발생 타입 상수
    public static final String TYPE_BASE = "BASE";
    public static final String TYPE_SENIORITY = "SENIORITY";
    public static final String TYPE_MONTHLY = "MONTHLY";
    public static final String TYPE_PROPORTIONAL = "PROPORTIONAL";
}
