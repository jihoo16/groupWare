package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 보고체계 변경 이력 Entity
 */
@Entity
@Table(name = "reporting_hierarchy_history", schema = "erp",
        indexes = {
                @Index(name = "idx_hierarchy_history_emp_idx", columnList = "emp_idx"),
                @Index(name = "idx_hierarchy_history_change_date", columnList = "change_date"),
                @Index(name = "idx_hierarchy_history_emp_date", columnList = "emp_idx, change_date")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportingHierarchyHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "reporting_hierarchy_history_sequence")
    @SequenceGenerator(name = "reporting_hierarchy_history_sequence", sequenceName = "erp.reporting_hierarchy_history_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "emp_idx", nullable = false)
    private Long empIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emp_idx", insertable = false, updatable = false)
    private User employee;

    @Column(name = "previous_manager_idx")
    private Long previousManagerIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_manager_idx", insertable = false, updatable = false)
    private User previousManager;

    @Column(name = "new_manager_idx")
    private Long newManagerIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_manager_idx", insertable = false, updatable = false)
    private User newManager;

    @Column(name = "change_reason", length = 500)
    private String changeReason;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;

    @Column(name = "changed_by_user_idx")
    private Long changedByUserIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_user_idx", insertable = false, updatable = false)
    private User changedByUser;
}
