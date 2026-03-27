package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 지출승인서 첨부파일 Entity
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "expense_approval_attachment", schema = "erp")
public class ExpenseApprovalAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expense_approval_attachment_seq")
    @SequenceGenerator(name = "expense_approval_attachment_seq",
                       sequenceName = "erp.expense_approval_attachment_sequence",
                       allocationSize = 1)
    @Column(name = "idx", nullable = false)
    private Long idx;

    /** 지출승인서 IDX (expense_approval.idx 참조) */
    @Column(name = "expense_approval_idx", nullable = false)
    private Long expenseApprovalIdx;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false)
    private String storedFilename;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "file_type", length = 100)
    private String fileType;

    /** RECEIPT: 영수증, DOCUMENT: 서명완료 공식문서 */
    @Column(name = "attachment_type", length = 20)
    private String attachmentType;

    @Column(name = "upload_user_idx")
    private Long uploadUserIdx;

    @Builder.Default
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (deleted == null) deleted = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
