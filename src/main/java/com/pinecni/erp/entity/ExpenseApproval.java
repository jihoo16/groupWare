package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 지출승인서 헤더 Entity
 *
 * - 기안일자: created_at 으로 통일 (별도 document_date 컬럼 없음)
 * - 첨부파일: approval_documents → approval_files 를 통해 관리
 * - 지출 항목: expense_detail (1:N, ON DELETE CASCADE)
 */
@Entity
@Table(name = "expense_approval", schema = "erp", indexes = {
        @Index(name = "idx_expense_approval_user_idx",  columnList = "user_idx"),
        @Index(name = "idx_expense_approval_document",  columnList = "document_idx"),
        @Index(name = "idx_expense_approval_deleted",   columnList = "deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpenseApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expense_approval_seq")
    @SequenceGenerator(name = "expense_approval_seq", sequenceName = "erp.expense_approval_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 기안자 (FK → user.idx) */
    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    /** 지출 항목 합계 캐시 */
    @Column(name = "total_amount", nullable = false)
    private Long totalAmount = 0L;

    /** 결재문서 연결 (FK → approval_documents.idx) */
    @Column(name = "document_idx")
    private Long documentIdx;

    /** 문서번호 캐시 (예: EXP-2025-00001) */
    @Column(name = "document_number", length = 50)
    private String documentNumber;

    /** 기안일자 = 생성일시 */
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
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // ── 관계 매핑 ────────────────────────────────────────────

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @JsonIgnore
    @OneToMany(mappedBy = "expenseApproval", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExpenseDetail> expenseDetails = new ArrayList<>();

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

    public void addExpenseDetail(ExpenseDetail detail) {
        expenseDetails.add(detail);
        detail.setExpenseApproval(this);
    }

    public void removeExpenseDetail(ExpenseDetail detail) {
        expenseDetails.remove(detail);
        detail.setExpenseApproval(null);
    }

    /** soft delete 처리 */
    public void softDelete(Long deletedByUserIdx) {
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedUserIdx = deletedByUserIdx;
    }
}
