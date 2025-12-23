package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 전자결재 문서 공통 메타데이터 Entity
 * - 모든 전자결재 문서의 공통 정보 저장
 * - vacation_request, expense_request 등과 1:N 관계
 */
@Entity
@Table(name = "approval_documents", schema = "erp", indexes = {
        @Index(name = "idx_ad_document_no", columnList = "document_no"),
        @Index(name = "idx_ad_document_type", columnList = "document_type"),
        @Index(name = "idx_ad_drafter", columnList = "drafter_user_idx"),
        @Index(name = "idx_ad_created_at", columnList = "created_at"),
        @Index(name = "idx_ad_deleted_at", columnList = "deleted_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalDocument extends BaseEntity {

    /**
     * 문서 IDX (PK)
     */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "approval_documents_sequence")
    @SequenceGenerator(name = "approval_documents_sequence", sequenceName = "erp.approval_documents_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /**
     * 문서번호 (자동생성, UNIQUE)
     * 예: VAC-20251218-001, EXP-20251218-001
     */
    @Column(name = "document_no", nullable = false, unique = true, length = 50)
    private String documentNo;

    /**
     * 문서 제목
     */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /**
     * 문서 유형
     * 예: 연차신청서, 지출승인서, 주간업무보고, 구매요청서 등
     */
    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    /**
     * 기안자 사용자 IDX
     */
    @Column(name = "drafter_user_idx", nullable = false)
    private Long drafterUserIdx;

    /**
     * 문서 내용 (TEXT)
     */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /**
     * 삭제일시 (Soft Delete)
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * 삭제자 사용자 IDX
     */
    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // ========== 관계 매핑 ==========

    /**
     * 기안자 정보 (User 테이블 조인)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drafter_user_idx", insertable = false, updatable = false)
    private User drafter;

    /**
     * 첨부파일 목록
     */
    @OneToMany(mappedBy = "approvalDocument", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ApprovalFile> approvalFiles = new ArrayList<>();
}
