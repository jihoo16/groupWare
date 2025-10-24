package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 결재 문서 첨부파일 Entity
 */
@Entity
@Table(name = "approval_files", schema = "erp", indexes = {
        @Index(name = "idx_af_document", columnList = "document_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalFile {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "approval_files_sequence")
    @SequenceGenerator(name = "approval_files_sequence", sequenceName = "erp.approval_files_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, length = 255)
    private String storedFilename;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "upload_user_idx")
    private Long uploadUserIdx;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_user_idx", insertable = false, updatable = false)
    private User uploader;
}
