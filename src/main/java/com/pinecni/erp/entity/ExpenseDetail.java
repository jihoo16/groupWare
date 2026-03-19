package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 지출승인서 지출 항목 Entity
 *
 * - 헤더(ExpenseApproval) 1건 : 항목 N건
 * - 헤더 삭제 시 ON DELETE CASCADE (orphanRemoval = true)
 * - 공식문서 출력 시 expense_date ASC 정렬
 */
@Entity
@Table(name = "expense_detail", schema = "erp", indexes = {
        @Index(name = "idx_expense_detail_approval_idx", columnList = "expense_approval_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpenseDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expense_detail_seq")
    @SequenceGenerator(name = "expense_detail_seq", sequenceName = "erp.expense_detail_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 상위 지출승인서 (FK → expense_approval.idx) */
    @Column(name = "expense_approval_idx", nullable = false)
    private Long expenseApprovalIdx;

    /** 지출 일자 */
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    /** 적요 */
    @Column(name = "description", length = 500)
    private String description;

    /** 상호명 (필수) */
    @Column(name = "shop_name", nullable = false, length = 200)
    private String shopName;

    /** 결제수단 (개인카드 / 현금) */
    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod = "개인카드";

    /** 금액 (원) */
    @Column(name = "amount", nullable = false)
    private Long amount = 0L;

    /** 비고 — 현금 선택 시 프론트에서 [현금사용] 자동입력 */
    @Column(name = "note", length = 200)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    // ── 관계 매핑 ────────────────────────────────────────────

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_approval_idx", insertable = false, updatable = false)
    private ExpenseApproval expenseApproval;

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
}
