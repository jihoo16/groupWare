package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 프로젝트 기본 정보 Entity
 */
@Entity
@Table(name = "projects", schema = "erp", indexes = {
        @Index(name = "idx_project_manager", columnList = "project_manager_idx"),
        @Index(name = "idx_project_start", columnList = "start_date"),
        @Index(name = "idx_project_end", columnList = "end_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "projects_sequence")
    @SequenceGenerator(name = "projects_sequence", sequenceName = "erp.projects_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_name", nullable = false, length = 200)
    private String projectName;

    @Column(name = "client_name", length = 200)
    private String clientName;

    @Column(name = "project_manager_idx")
    private Long projectManagerIdx;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "project_status", nullable = false, length = 20)
    private String projectStatus = "PLANNING";

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "receipt_url", length = 500)
    private String receiptUrl;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "activity_budget", precision = 15, scale = 2)
    private BigDecimal activityBudget = BigDecimal.ZERO;

    @Column(name = "equipment_budget", precision = 15, scale = 2)
    private BigDecimal equipmentBudget = BigDecimal.ZERO;

    @Column(name = "material_budget", precision = 15, scale = 2)
    private BigDecimal materialBudget = BigDecimal.ZERO;

    @Column(name = "progress_rate", precision = 5, scale = 2)
    private BigDecimal progressRate = BigDecimal.ZERO;

    @Column(name = "total_period_start")
    private LocalDate totalPeriodStart;

    @Column(name = "total_period_end")
    private LocalDate totalPeriodEnd;


    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_manager_idx", insertable = false, updatable = false)
    private User projectManager;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectMember> projectMembers = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectCard> projectCards = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectFile> projectFiles = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectExpenseSetting> expenseSettings = new ArrayList<>();
}
