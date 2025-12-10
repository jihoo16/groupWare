package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "weekly_report", schema = "erp")
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

    @Size(max = 200)
    @Column(name = "project_name", length = 200)
    private String projectName;

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

    @Column(name = "weekly_achievement_rate")
    private Integer weeklyAchievementRate;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

}