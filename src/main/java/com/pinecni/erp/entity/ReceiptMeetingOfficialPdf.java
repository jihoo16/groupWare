package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * 연구비증빙 회의록 공식 PDF 파일 정보 Entity
 */
@Entity
@Table(name = "receipt_meeting_official_pdf", schema = "erp", indexes = {
        @Index(name = "idx_receipt_meeting_official_pdf_meeting_idx", columnList = "receipt_meeting_idx"),
        @Index(name = "idx_receipt_meeting_official_pdf_created_at", columnList = "created_at")
})
@SQLRestriction("deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ReceiptMeetingOfficialPdf {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_meeting_official_pdf_sequence")
    @SequenceGenerator(name = "receipt_meeting_official_pdf_sequence", sequenceName = "erp.receipt_meeting_official_pdf_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_meeting_idx", nullable = false)
    private Long receiptMeetingIdx;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Builder.Default
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // 관계 매핑
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_meeting_idx", insertable = false, updatable = false)
    private ReceiptMeeting receiptMeeting;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
