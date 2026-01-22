package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 프로젝트 주간업무보고 공식 PDF 파일 정보 Entity
 */
@Entity
@Table(name = "weekly_report_official_pdf", schema = "erp", indexes = {
        @Index(name = "idx_weekly_report_official_pdf_document_idx", columnList = "document_idx"),
        @Index(name = "idx_weekly_report_official_pdf_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class WeeklyReportOfficialPdf {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "weekly_report_official_pdf_sequence")
    @SequenceGenerator(name = "weekly_report_official_pdf_sequence", sequenceName = "erp.weekly_report_official_pdf_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

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

    // 관계 매핑
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
