package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * 자격증 첨부파일 (자격증 사본 앞/뒷면 등)
 *
 * 1:N — 한 자격증 항목에 여러 파일 첨부 가능
 * 본인만 업로드/삭제 가능, 관리자/역량열람자는 미리보기/다운로드 가능
 */
@Entity
@Table(name = "user_certificate_attachment", schema = "erp", indexes = {
        @Index(name = "idx_uca_certificate", columnList = "user_certificate_idx"),
        @Index(name = "idx_uca_deleted",     columnList = "is_deleted")
})
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCertificateAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_certificate_attachment_sequence")
    @SequenceGenerator(name = "user_certificate_attachment_sequence",
            sequenceName = "erp.user_certificate_attachment_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_certificate_idx", nullable = false)
    private Long userCertificateIdx;

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

    @Column(name = "upload_user_idx", nullable = false)
    private Long uploadUserIdx;

    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) uploadedAt = LocalDateTime.now();
    }
}
