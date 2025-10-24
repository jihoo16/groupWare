package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 결재선 Entity
 */
@Entity
@Table(name = "approval_lines", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"document_idx", "sequence"}),
        indexes = {
                @Index(name = "idx_al_document", columnList = "document_idx"),
                @Index(name = "idx_al_approver", columnList = "approver_user_idx"),
                @Index(name = "idx_al_status", columnList = "status")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalLine {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "approval_lines_sequence")
    @SequenceGenerator(name = "approval_lines_sequence", sequenceName = "erp.approval_lines_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

    @Column(name = "approver_user_idx", nullable = false)
    private Long approverUserIdx;

    @Column(name = "approver_role", nullable = false, length = 50)
    private String approverRole;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "대기";

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "comment", length = 500)
    private String comment;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_user_idx", insertable = false, updatable = false)
    private User approver;
}
