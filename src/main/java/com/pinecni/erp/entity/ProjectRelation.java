package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 프로젝트 연계 정보 Entity
 */
@Entity
@Table(name = "project_relations", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"source_project_idx", "target_project_idx"}),
        indexes = {
                @Index(name = "idx_pr_source", columnList = "source_project_idx"),
                @Index(name = "idx_pr_target", columnList = "target_project_idx")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_relations_sequence")
    @SequenceGenerator(name = "project_relations_sequence", sequenceName = "erp.project_relations_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "source_project_idx", nullable = false)
    private Long sourceProjectIdx;

    @Column(name = "target_project_idx", nullable = false)
    private Long targetProjectIdx;

    @Column(name = "relation_type", length = 50)
    private String relationType = "RELATED";

    @Column(name = "description", length = 500)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_project_idx", insertable = false, updatable = false)
    private Project sourceProject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_project_idx", insertable = false, updatable = false)
    private Project targetProject;
}
