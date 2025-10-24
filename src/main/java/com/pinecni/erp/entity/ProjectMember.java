package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * 프로젝트 참여자 Entity
 */
@Entity
@Table(name = "project_members", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_idx", "employee_idx", "participation_start_date"}),
        indexes = {
                @Index(name = "idx_pm_project", columnList = "project_idx"),
                @Index(name = "idx_pm_employee", columnList = "employee_idx"),
                @Index(name = "idx_pm_dates", columnList = "participation_start_date, participation_end_date")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_members_sequence")
    @SequenceGenerator(name = "project_members_sequence", sequenceName = "erp.project_members_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "employee_idx", nullable = false)
    private Long employeeIdx;

    @Column(name = "participation_start_date", nullable = false)
    private LocalDate participationStartDate;

    @Column(name = "participation_end_date")
    private LocalDate participationEndDate;

    @Column(name = "role", length = 100)
    private String role;

    @Column(name = "is_active")
    private Boolean isActive = true;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_idx", insertable = false, updatable = false)
    private User employee;
}
