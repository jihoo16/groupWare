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
@Table(name = "monthly_report", schema = "erp")
public class MonthlyReport {
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

    @Size(max = 7)
    @NotNull
    @Column(name = "report_month", nullable = false, length = 7)
    private String reportMonth;

    @Column(name = "main_tasks", length = Integer.MAX_VALUE)
    private String mainTasks;

    @Column(name = "performance", length = Integer.MAX_VALUE)
    private String performance;

    @Column(name = "improvements", length = Integer.MAX_VALUE)
    private String improvements;

    @Column(name = "next_month_plan", length = Integer.MAX_VALUE)
    private String nextMonthPlan;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

}