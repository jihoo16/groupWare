package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 연차 신청 Entity
 */
@Entity
@Table(name = "vacation_requests", schema = "erp", indexes = {
        @Index(name = "idx_vr_document", columnList = "document_idx"),
        @Index(name = "idx_vr_user", columnList = "user_idx"),
        @Index(name = "idx_vr_dates", columnList = "start_date, end_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "vacation_requests_sequence")
    @SequenceGenerator(name = "vacation_requests_sequence", sequenceName = "erp.vacation_requests_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_idx", nullable = false, unique = true)
    private Long documentIdx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "vacation_type", nullable = false, length = 50)
    private String vacationType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "days_count", nullable = false)
    private Integer daysCount;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "address", length = 200)
    private String address;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "contact", length = 20)
    private String contact;

    @Column(name = "emergency_contact", length = 20)
    private String emergencyContact;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    // 관계 매핑
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;
}
