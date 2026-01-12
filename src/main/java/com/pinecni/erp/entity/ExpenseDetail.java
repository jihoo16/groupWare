package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 지출 항목 Entity
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
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expense_detail_sequence")
    @SequenceGenerator(name = "expense_detail_sequence", sequenceName = "erp.expense_detail_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "expense_approval_idx", nullable = false)
    private Long expenseApprovalIdx;

    @Column(name = "expense_date", length = 10)
    private String expenseDate;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "shop_name", length = 200)
    private String shopName;

    @Column(name = "amount", nullable = false)
    private Long amount = 0L;

    @Column(name = "note", length = 200)
    private String note;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // 관계 매핑
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_approval_idx", insertable = false, updatable = false)
    private ExpenseApproval expenseApproval;

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
