package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "receipt_overtime", schema = "erp")
@SQLRestriction("deleted = false")
public class ReceiptOvertime {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_idx", nullable = false)
    private Project projectIdx;

    @Size(max = 50)
    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @NotNull
    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    @NotNull
    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;

    @NotNull
    @Column(name = "approval_date", nullable = false)
    private LocalDate approvalDate;

    @Size(max = 200)
    @Column(name = "document_title", length = 200)
    private String documentTitle;

    @Column(name = "document_content", length = Integer.MAX_VALUE)
    private String documentContent;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Size(max = 50)
    @Column(name = "payment_type", length = 50)
    private String paymentType;

    @Size(max = 20)
    @ColumnDefault("'PENDING'")
    @Column(name = "status", length = 20)
    private String status;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @Column(name = "document_idx")
    private Long documentIdx;

    // Soft delete 필드
    @ColumnDefault("false")
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;
}