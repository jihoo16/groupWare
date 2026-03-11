package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 연구비증빙 출장+회의 첨부파일 Entity
 * (receipt_trip_meeting_attachment 테이블)
 */
@Entity
@Table(name = "receipt_trip_meeting_attachment", schema = "erp", indexes = {
        @Index(name = "idx_rtm_attachment_rtm",     columnList = "receipt_trip_meeting_idx"),
        @Index(name = "idx_rtm_attachment_type",    columnList = "attachment_type"),
        @Index(name = "idx_rtm_attachment_deleted", columnList = "deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripMeetingAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_meeting_attachment_seq")
    @SequenceGenerator(name = "receipt_trip_meeting_attachment_seq",
                       sequenceName = "erp.receipt_trip_meeting_attachment_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_trip_meeting_idx", nullable = false)
    private Long receiptTripMeetingIdx;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    /** 서버 저장 파일명 (마이그레이션으로 saving_filename → stored_filename 변경) */
    @Column(name = "stored_filename", nullable = false, length = 255)
    private String storedFilename;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_type", length = 100)
    private String fileType;

    /** RECEIPT(영수증) / DOCUMENT(공식문서) */
    @Builder.Default
    @Column(name = "attachment_type", nullable = false, length = 20)
    private String attachmentType = "RECEIPT";

    @Column(name = "upload_user_idx")
    private Long uploadUserIdx;

    /**
     * 회의 세션 IDX (다중 회의 첨부파일 구분용)
     * - null: 출장 첨부파일 또는 첫 번째 회의 backward compat
     * - non-null: 특정 회의 세션 첨부파일
     */
    @Column(name = "session_idx")
    private Long sessionIdx;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // ─── 관계 매핑 ──────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_trip_meeting_idx", insertable = false, updatable = false)
    private ReceiptTripMeeting receiptTripMeeting;

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
