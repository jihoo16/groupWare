package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 연구비증빙 출장 첨부파일 Entity
 */
@Entity
@Table(name = "receipt_trip_attachment", schema = "erp", indexes = {
        @Index(name = "idx_receipt_trip_attachment_trip",    columnList = "receipt_trip_idx"),
        @Index(name = "idx_receipt_trip_attachment_type",    columnList = "attachment_type"),
        @Index(name = "idx_receipt_trip_attachment_deleted", columnList = "deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_attachment_sequence")
    @SequenceGenerator(name = "receipt_trip_attachment_sequence",
                       sequenceName = "erp.receipt_trip_attachment_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_trip_idx", nullable = false)
    private Long receiptTripIdx;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, length = 255)
    private String storedFilename;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_type", length = 100)
    private String fileType;

    /** RECEIPT(영수증) / DOCUMENT(공식문서) */
    @Column(name = "attachment_type", nullable = false, length = 20)
    private String attachmentType = "RECEIPT";

    @Column(name = "upload_user_idx")
    private Long uploadUserIdx;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_trip_idx", insertable = false, updatable = false)
    private ReceiptTrip receiptTrip;

    @PrePersist
    protected void onCreate() {
        createdAt  = LocalDateTime.now();
        updatedAt  = LocalDateTime.now();
        uploadedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
