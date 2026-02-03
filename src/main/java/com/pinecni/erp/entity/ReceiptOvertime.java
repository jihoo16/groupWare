package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "receipt_overtime", schema = "erp")
public class ReceiptOvertime {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_idx", nullable = false)
    private Project projectIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    @Size(max = 50)
    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @NotNull
    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    @Size(max = 100)
    @NotNull
    @Column(name = "author_name", nullable = false, length = 100)
    private String authorName;

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

    @Column(name = "document_idx")
    private Long documentIdx;

}