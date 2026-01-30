package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * 회의록 첨부파일 정보 Entity
 */
@Entity
@Table(name = "receipt_meeting_attachment", schema = "erp", indexes = {
        @Index(name = "idx_attachment_receipt_meeting", columnList = "receipt_meeting_idx"),
        @Index(name = "idx_attachment_upload_user", columnList = "upload_user_idx")
})
@SQLRestriction("deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptMeetingAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_meeting_attachment_sequence")
    @SequenceGenerator(name = "receipt_meeting_attachment_sequence", sequenceName = "erp.receipt_meeting_attachment_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_meeting_idx", nullable = false)
    private Long receiptMeetingIdx;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "upload_user_idx", nullable = false)
    private Long uploadUserIdx;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_meeting_idx", insertable = false, updatable = false)
    private ReceiptMeeting receiptMeeting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_user_idx", insertable = false, updatable = false)
    private User uploadUser;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
