package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 지출품의서 지출 예정 내역 항목 Entity
 *
 * - 헤더(ExpenseRequisition) 1건 : 항목 N건
 * - 헤더 삭제 시 ON DELETE CASCADE (orphanRemoval = true)
 * - 공식문서 출력 시 sort_order ASC 정렬
 */
@Entity
@Table(name = "expense_requisition_item", schema = "erp", indexes = {
        @Index(name = "idx_expense_requisition_item_req", columnList = "expense_requisition_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpenseRequisitionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx")
    private Long idx;

    /** 상위 지출품의서 (FK → expense_requisition.idx) */
    @Column(name = "expense_requisition_idx", nullable = false)
    private Long expenseRequisitionIdx;

    /** 날짜 */
    @Column(name = "item_date")
    private LocalDate itemDate;

    /** 적요 (지출 내용) */
    @Column(name = "item_desc", length = 500)
    private String itemDesc;

    /** 금액 (원 단위) */
    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    /** 상대처 (거래처명) */
    @Column(name = "vendor", length = 200)
    private String vendor;

    /** 비고 */
    @Column(name = "remark", length = 200)
    private String remark;

    /** 화면 표시 순서 (0-based) */
    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── 관계 매핑 ────────────────────────────────────────────

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_requisition_idx", insertable = false, updatable = false)
    private ExpenseRequisition expenseRequisition;

    // ── 라이프사이클 ─────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
