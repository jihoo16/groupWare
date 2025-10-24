package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 프로젝트별 직급별 경비 설정 Entity
 */
@Entity
@Table(name = "project_expense_settings", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_idx", "position_code"}),
        indexes = {
                @Index(name = "idx_pes_project", columnList = "project_idx"),
                @Index(name = "idx_pes_position", columnList = "position_code")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectExpenseSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_expense_settings_sequence")
    @SequenceGenerator(name = "project_expense_settings_sequence", sequenceName = "erp.project_expense_settings_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "position_code", nullable = false, length = 20)
    private String positionCode;

    @Column(name = "position_name", nullable = false, length = 50)
    private String positionName;

    @Column(name = "transit_allowance", length = 50)
    private String transitAllowance = "실비";

    @Column(name = "daily_allowance")
    private Integer dailyAllowance = 0;

    @Column(name = "meal_allowance")
    private Integer mealAllowance = 0;

    @Column(name = "meeting_allowance")
    private Integer meetingAllowance = 0;

    @Column(name = "overtime_meal_allowance")
    private Integer overtimeMealAllowance = 0;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;
}
