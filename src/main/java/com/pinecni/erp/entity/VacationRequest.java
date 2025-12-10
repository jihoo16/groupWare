package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 연차 신청 Entity
 */
@Entity
@Table(name = "vacation_request", schema = "erp", indexes = {
        @Index(name = "idx_vacation_request_user_idx", columnList = "user_idx"),
        @Index(name = "idx_vacation_request_dates", columnList = "start_date, end_date"),
        @Index(name = "idx_vacation_request_apply_date", columnList = "apply_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vacation_request_sequence")
    @SequenceGenerator(name = "vacation_request_sequence", sequenceName = "vacation_request_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "vacation_type", nullable = false, length = 20)
    private String vacationType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "days", nullable = false, precision = 4, scale = 1)
    private BigDecimal days;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "content", length = 200)
    private String content;

    @Column(name = "allow_minus_vacation")
    private Boolean allowMinusVacation = false;

    @Column(name = "special_approval_reason", columnDefinition = "TEXT")
    private String specialApprovalReason;

    @Column(name = "apply_date", nullable = false)
    private LocalDate applyDate;

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
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

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
}
