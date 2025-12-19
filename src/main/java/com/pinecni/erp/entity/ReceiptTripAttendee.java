package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 출장별 참석자/동행자 정보 Entity
 */
@Entity
@Table(name = "receipt_trip_attendee", schema = "erp", indexes = {
        @Index(name = "idx_attendee_receipt_trip", columnList = "receipt_trip_idx"),
        @Index(name = "idx_attendee_trip_employee", columnList = "user_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_attendee_sequence")
    @SequenceGenerator(name = "receipt_trip_attendee_sequence", sequenceName = "erp.receipt_trip_attendee_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_trip_idx", nullable = false)
    private Long receiptTripIdx;

    @Column(name = "attendee_type", nullable = false, length = 20)
    private String attendeeType;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "user_idx")
    private Long userIdx;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_trip_idx", insertable = false, updatable = false)
    private ReceiptTrip receiptTrip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
