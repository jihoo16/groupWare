package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_career",
    schema = "erp",
    indexes = {
        @Index(name = "idx_user_career_user_idx",   columnList = "user_idx"),
        @Index(name = "idx_user_career_is_deleted",  columnList = "is_deleted")
    }
)
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserCareer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_career_sequence")
    @SequenceGenerator(name = "user_career_sequence", sequenceName = "erp.user_career_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "career_category", nullable = false, length = 200)
    private String careerCategory;

    @Builder.Default
    @Column(name = "is_industry_experience", nullable = false)
    private Boolean isIndustryExperience = false;

    @Column(name = "career_summary", columnDefinition = "TEXT")
    private String careerSummary;

    @Column(name = "career_start_date", nullable = false)
    private LocalDate careerStartDate;

    @Column(name = "career_end_date")
    private LocalDate careerEndDate;

    @Builder.Default
    @Column(name = "career_period_years", nullable = false)
    private Integer careerPeriodYears = 0;

    @Builder.Default
    @Column(name = "career_period_months", nullable = false)
    private Integer careerPeriodMonths = 0;

    @Builder.Default
    @Column(name = "is_now", nullable = false)
    private Boolean isNow = false;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;
}
