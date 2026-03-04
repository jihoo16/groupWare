package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 연구비증빙 출장 기본 정보 Entity
 */
@Entity
@Table(name = "receipt_trip", schema = "erp", indexes = {
        @Index(name = "idx_receipt_trip_project", columnList = "project_idx"),
        @Index(name = "idx_receipt_trip_card", columnList = "card_idx"),
        @Index(name = "idx_receipt_trip_author", columnList = "author_idx"),
        @Index(name = "idx_receipt_trip_status", columnList = "status"),
        @Index(name = "idx_receipt_trip_date", columnList = "trip_date"),
        @Index(name = "idx_receipt_trip_document", columnList = "document_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_sequence")
    @SequenceGenerator(name = "receipt_trip_sequence", sequenceName = "erp.receipt_trip_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    @Column(name = "document_idx")
    private Long documentIdx;

    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    @Column(name = "trip_date", nullable = false)
    private LocalDate tripDate;

    @Column(name = "location", nullable = false, length = 200)
    private String location;

    @Column(name = "transportation_fee", precision = 15, scale = 2)
    private BigDecimal transportationFee;

    @Column(name = "accommodation_fee", precision = 15, scale = 2)
    private BigDecimal accommodationFee;

    @Column(name = "meal_fee", precision = 15, scale = 2)
    private BigDecimal mealFee;

    @Column(name = "other_fee", precision = 15, scale = 2)
    private BigDecimal otherFee;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(name = "duration")
    private Integer duration;

    @Column(name = "status", length = 20)
    private String status = "PENDING";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_idx", insertable = false, updatable = false)
    private ProjectCard projectCard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_idx", insertable = false, updatable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @OneToMany(mappedBy = "receiptTrip", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReceiptTripAttendee> attendees = new ArrayList<>();

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
