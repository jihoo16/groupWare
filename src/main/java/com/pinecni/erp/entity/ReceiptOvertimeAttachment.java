package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 연구비증빙 야근식대 첨부파일 Entity
 *
 * 패턴: ReceiptTripAttachment / ReceiptMeetingAttachment 와 동일 구조
 * - PK: idx (IDENTITY)
 * - FK: receipt_overtime_idx (Long, 직접 참조 - @ManyToOne 미사용)
 * - 소프트 딜리트: deleted / deleted_at / deleted_user_idx
 * - 업로드 추적: upload_user_idx
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "receipt_overtime_attachment", schema = "erp")
public class ReceiptOvertimeAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long idx;

    /** 야근식대 IDX (receipt_overtime.idx 참조) */
    @Column(name = "receipt_overtime_idx", nullable = false)
    private Long receiptOvertimeIdx;

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

    @Column(name = "attachment_type", length = 20)
    private String attachmentType;

    /** 업로드한 사용자 IDX */
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
        if (deleted == null) deleted = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
