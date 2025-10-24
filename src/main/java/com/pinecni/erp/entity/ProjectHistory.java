package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 프로젝트 변경 이력 Entity
 */
@Entity
@Table(name = "project_history", schema = "erp", indexes = {
        @Index(name = "idx_ph_project", columnList = "project_idx"),
        @Index(name = "idx_ph_changed", columnList = "changed_at"),
        @Index(name = "idx_ph_action", columnList = "action_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_history_sequence")
    @SequenceGenerator(name = "project_history_sequence", sequenceName = "erp.project_history_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "previous_status", length = 20)
    private String previousStatus;

    @Column(name = "new_status", length = 20)
    private String newStatus;

    @Column(name = "change_description", columnDefinition = "TEXT")
    private String changeDescription;

    @Column(name = "changed_user_idx")
    private Long changedUserIdx;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_user_idx", insertable = false, updatable = false)
    private User changedUser;
}
