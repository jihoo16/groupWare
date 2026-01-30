package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * 회의록별 참석자 정보 Entity
 */
@Entity
@Table(name = "receipt_meeting_attendee", schema = "erp", indexes = {
        @Index(name = "idx_attendee_receipt_meeting", columnList = "receipt_meeting_idx"),
        @Index(name = "idx_attendee_employee", columnList = "user_idx")
})
@SQLRestriction("deleted = false")
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

    /**
     * 외부 참석자 여부
     * - true: 외부 인력 (user_idx는 external_persons.idx 참조)
     * - false: 내부 인력 (user_idx는 users.idx 참조)
     */
    @Column(name = "is_external", nullable = false)
    private Boolean isExternal = false;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * 참석자 IDX
     * - isExternal = false: users.idx
     * - isExternal = true: external_persons.idx
     * FK 제약조건 없음 (두 개의 다른 테이블 참조)
     */
    @Column(name = "user_idx")
    private Long userIdx;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    /**
     * 회의비 (참석자별 회의 비용)
     */
    @Column(name = "meeting_expense")
    private Long meetingExpense = 0L;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_meeting_idx", insertable = false, updatable = false)
    private ReceiptMeeting receiptMeeting;

    // user_idx는 FK 없이 직접 참조
    // - isExternal = false일 때: User 엔티티
    // - isExternal = true일 때: ExternalPerson 엔티티
    // 조회 시 isExternal 값에 따라 적절한 테이블 조인 필요

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
