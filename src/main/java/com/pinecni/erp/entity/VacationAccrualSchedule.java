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
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vacation_accrual_schedule_sequence")
    @SequenceGenerator(name = "vacation_accrual_schedule_sequence", sequenceName = "erp.vacation_accrual_schedule_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "year", nullable = false)
    private Integer year;

    /**
     * 연차 발생일
     * - 기본연차:  1월 1일
     * - 근속가산:  입사일 기준 만 3년, 5년, 7년...
     * - 월차:     입사월+1일, +2일... (매월 입사일 다음날)
     * - 비례연차:  1주년일 (1주년 도래하는 해)
     * - 보상휴가:  만 10년 주년일 (1회한)
     */
    @Column(name = "accrual_date", nullable = false)
    private LocalDate accrualDate;

    /**
     * 발생 타입 (TYPE_* 상수 사용)
     * - 기본연차:  1년 이상 근속자, 매년 1/1 발생
     * - 근속가산:  만 3년부터 매 2년마다 +1일 (최대 +10일)
     * - 월차:     1년 미만 직원, 매월 만근 후 1일 발생
     * - 비례연차:  1주년 도래 연도, 1주년일~12/31 비례 발생
     * - 보상휴가:  만 10년 근속 시 5일 (1회한, 만료일 당해 12/31)
     */
    @Column(name = "accrual_type", nullable = false, length = 40)
    private String accrualType;

    @Column(name = "days", nullable = false, precision = 4, scale = 1)
    private BigDecimal days = BigDecimal.ZERO;

    /**
     * 발생 사유 설명
     * 예: "기본 연차 15일", "만 3년 근속 가산 (+1일)", "9월 만근 월차", "만 10년 근속 보상 휴가 (+5일)"
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * 연차 만료일
     * - 월차(마지막 제외): 입사일 + 1년 - 1일
     * - 월차(마지막):      1주년 월 말일
     * - 기본연차 / 근속가산 / 비례연차 / 보상휴가: 해당 연도 12월 31일
     */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    /**
     * 만료 여부. 스케줄러가 expiry_date < 오늘인 월차 행을 true로 업데이트.
     */
    @Column(name = "is_expired", nullable = false)
    private Boolean isExpired = false;

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
    public static final String TYPE_BASE         = "기본연차";
    public static final String TYPE_SENIORITY    = "근속가산";
    public static final String TYPE_MONTHLY      = "월차";
    public static final String TYPE_PROPORTIONAL = "비례연차";
    public static final String TYPE_COMPENSATORY = "보상휴가";
    public static final String TYPE_CARRY_OVER   = "이월월차";  // 전년도 미사용 월차 이월
}
