package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 회의록별 참석자 정보 Entity
 */
@Entity
@Table(name = "receipt_meeting_attendee", schema = "erp", indexes = {
        @Index(name = "idx_attendee_receipt_meeting", columnList = "receipt_meeting_idx"),
        @Index(name = "idx_attendee_employee", columnList = "user_idx")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptMeetingAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_meeting_attendee_sequence")
    @SequenceGenerator(name = "receipt_meeting_attendee_sequence", sequenceName = "erp.receipt_meeting_attendee_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_meeting_idx", nullable = false)
    private Long receiptMeetingIdx;

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
    @JoinColumn(name = "receipt_meeting_idx", insertable = false, updatable = false)
    private ReceiptMeeting receiptMeeting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
