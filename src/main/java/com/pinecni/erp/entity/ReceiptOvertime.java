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
@Table(name = "receipt_overtime", schema = "erp")
@SQLRestriction("is_deleted = false")
public class ReceiptOvertime {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_overtime_sequence")
    @SequenceGenerator(name = "receipt_overtime_sequence", sequenceName = "erp.receipt_overtime_sequence", allocationSize = 1)
    @Column(name = "idx", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_idx", nullable = false)
    private Project projectIdx;

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

    @Column(name = "document_idx")
    private Long documentIdx;

    @NotNull
    @ColumnDefault("false")
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

}