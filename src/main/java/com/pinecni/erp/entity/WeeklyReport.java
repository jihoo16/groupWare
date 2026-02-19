package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "project_weekly_report", schema = "erp")
public class WeeklyReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "project_idx")
    private Long projectIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @Column(name = "document_idx")
    private Long documentIdx;

    @Size(max = 100)
    @NotNull
    @Column(name = "report_period", nullable = false, length = 100)
    private String reportPeriod;

    @Column(name = "main_tasks", length = Integer.MAX_VALUE)
    private String mainTasks;

    @Column(name = "achievements", length = Integer.MAX_VALUE)
    private String achievements;

    @Column(name = "issues", length = Integer.MAX_VALUE)
    private String issues;

    @Column(name = "next_week_plan", length = Integer.MAX_VALUE)
    private String nextWeekPlan;

    @Column(name = "remarks", length = Integer.MAX_VALUE)
    private String remarks;

    @Column(name = "reference_names", length = Integer.MAX_VALUE)
    private String referenceNames;

    @Column(name = "weekly_achievement_rate")
    private Integer weeklyAchievementRate;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

}