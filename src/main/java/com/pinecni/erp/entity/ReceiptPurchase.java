package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "receipt_purchase", schema = "erp")
@SQLRestriction("is_deleted = false")
public class ReceiptPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_purchase_sequence")
    @SequenceGenerator(name = "receipt_purchase_sequence", sequenceName = "erp.receipt_purchase_sequence", allocationSize = 1)
    @Column(name = "idx", nullable = false)
    private Long idx;

    @NotNull
    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @NotNull
    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    /** 구매 유형: 'material'(재료비), 'equipment'(장비비) 등 자유값 */
    @NotNull
    @Size(max = 50)
    @Column(name = "purchase_type", nullable = false, length = 50)
    private String purchaseType;

    @NotNull
    @Column(name = "approval_date", nullable = false)
    private LocalDate approvalDate;

    @Size(max = 200)
    @Column(name = "document_title", length = 200)
    private String documentTitle;

    @Column(name = "document_content", length = Integer.MAX_VALUE)
    private String documentContent;

    /** 지급종류: 'card'(연구비카드) or 'transfer'(연구비이체) */
    @Size(max = 20)
    @Column(name = "payment_type", length = 20)
    private String paymentType;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "document_idx")
    private Long documentIdx;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
