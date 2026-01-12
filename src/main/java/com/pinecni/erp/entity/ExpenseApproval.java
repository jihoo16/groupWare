package com.pinecni.erp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 지출승인서 Entity
 */
@Entity
@Table(name = "expense_approval", schema = "erp", indexes = {
        @Index(name = "idx_expense_approval_user_idx", columnList = "user_idx"),
        @Index(name = "idx_expense_approval_dates", columnList = "document_date, apply_date"),
        @Index(name = "idx_expense_approval_document", columnList = "document_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpenseApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "expense_approval_sequence")
    @SequenceGenerator(name = "expense_approval_sequence", sequenceName = "erp.expense_approval_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "document_date", nullable = false)
    private LocalDate documentDate;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @Column(name = "apply_date", nullable = false)
    private LocalDate applyDate;

    @Column(name = "total_amount", nullable = false)
    private Long totalAmount = 0L;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "document_idx")
    private Long documentIdx;

    // 관계 매핑
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

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (applyDate == null) {
            applyDate = LocalDate.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // 헬퍼 메서드
    public void addExpenseDetail(ExpenseDetail detail) {
        expenseDetails.add(detail);
        detail.setExpenseApproval(this);
    }

    public void removeExpenseDetail(ExpenseDetail detail) {
        expenseDetails.remove(detail);
        detail.setExpenseApproval(null);
    }
}
