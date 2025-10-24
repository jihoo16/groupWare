package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 결재 이력 Entity
 */
@Entity
@Table(name = "approval_histories", schema = "erp", indexes = {
        @Index(name = "idx_ah_document", columnList = "document_idx"),
        @Index(name = "idx_ah_actioned", columnList = "actioned_at"),
        @Index(name = "idx_ah_user", columnList = "actioned_user_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "approval_histories_sequence")
    @SequenceGenerator(name = "approval_histories_sequence", sequenceName = "erp.approval_histories_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "previous_status", length = 20)
    private String previousStatus;

    @Column(name = "new_status", length = 20)
    private String newStatus;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "actioned_user_idx", nullable = false)
    private Long actionedUserIdx;

    @Column(name = "actioned_at", nullable = false)
    private LocalDateTime actionedAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actioned_user_idx", insertable = false, updatable = false)
    private User actionedUser;
}
