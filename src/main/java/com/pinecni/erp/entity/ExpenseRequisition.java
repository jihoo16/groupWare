package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 지출품의서 헤더 Entity
 *
 * - 작성일자: created_at 으로 통일 (별도 document_date 컬럼 없음)
 * - 첨부파일: approval_documents → approval_files 를 통해 관리
 * - 지출 예정 내역: expense_requisition_item (1:N, ON DELETE CASCADE)
 * - 지급종류: 현금 | 사업비카드 | 개인카드
 */
@Entity
@Table(name = "expense_requisition", schema = "erp", indexes = {
        @Index(name = "idx_expense_requisition_author",      columnList = "author_idx"),
        @Index(name = "idx_expense_requisition_document",    columnList = "document_idx"),
        @Index(name = "idx_expense_requisition_is_deleted",  columnList = "is_deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpenseRequisition {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expense_requisition_seq")
    @SequenceGenerator(name = "expense_requisition_seq",
            sequenceName = "erp.expense_requisition_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 작성자 (FK → users.idx) */
    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    /** 품의 내용 (필수) */
    @Column(name = "content", nullable = false)
    private String content;

    /** 지급종류 (현금 | 사업비카드 | 개인카드) */
    @Column(name = "payment_type", nullable = false, length = 20)
    private String paymentType;

    /** 지출 예정 내역 금액 합계 캐시 */
    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    /** 특이사항 (선택) */
    @Column(name = "special_note")
    private String specialNote;

    /** 전자결재 문서 연결 (FK → approval_documents.idx, NULL 허용) */
    @Column(name = "document_idx")
    private Long documentIdx;

    /** 문서번호 캐시 (예: REQ-2026-00001). approval_documents 조인 없이 빠른 조회용 */
    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    /** soft delete */
    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // ── 관계 매핑 ────────────────────────────────────────────

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_idx", insertable = false, updatable = false)
    private User author;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @JsonIgnore
    @OneToMany(mappedBy = "expenseRequisition", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExpenseRequisitionItem> items = new ArrayList<>();

    // ── 라이프사이클 ─────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── 헬퍼 메서드 ──────────────────────────────────────────

    public void softDelete(Long deletedByUserIdx) {
        this.isDeleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedUserIdx = deletedByUserIdx;
    }
}
