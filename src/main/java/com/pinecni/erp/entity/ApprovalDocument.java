package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 문서 공통 메타데이터 Entity
 */
@Entity
@Table(name = "approval_documents", schema = "erp", indexes = {
        @Index(name = "idx_ad_drafter", columnList = "drafter_user_idx"),
        @Index(name = "idx_ad_created", columnList = "created_at"),
        @Index(name = "idx_ad_doc_no", columnList = "document_no"),
        @Index(name = "idx_ad_doc_type", columnList = "document_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "approval_documents_sequence")
    @SequenceGenerator(name = "approval_documents_sequence", sequenceName = "erp.approval_documents_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_no", nullable = false, unique = true, length = 50)
    private String documentNo;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "drafter_user_idx", nullable = false)
    private Long drafterUserIdx;

    @Column(name = "department_code", length = 20)
    private String departmentCode;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "amount")
    private Integer amount;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drafter_user_idx", insertable = false, updatable = false)
    private User drafter;

    @OneToMany(mappedBy = "approvalDocument", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ApprovalFile> approvalFiles = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
