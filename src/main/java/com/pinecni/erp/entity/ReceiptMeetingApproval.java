package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 회의록 결재선 정보 Entity
 */
@Entity
@Table(name = "receipt_meeting_approval", schema = "erp", indexes = {
        @Index(name = "idx_approval_receipt_meeting", columnList = "receipt_meeting_idx"),
        @Index(name = "idx_approval_approver", columnList = "approver_idx"),
        @Index(name = "idx_receipt_meeting_approval_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptMeetingApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_meeting_approval_sequence")
    @SequenceGenerator(name = "receipt_meeting_approval_sequence", sequenceName = "erp.receipt_meeting_approval_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_meeting_idx", nullable = false)
    private Long receiptMeetingIdx;

    @Column(name = "approver_idx", nullable = false)
    private Long approverIdx;

    @Column(name = "status", length = 20)
    private String status = "PENDING";

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_meeting_idx", insertable = false, updatable = false)
    private ReceiptMeeting receiptMeeting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_idx", insertable = false, updatable = false)
    private User approver;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
