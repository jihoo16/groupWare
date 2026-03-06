package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 연구비증빙 회의+출장 참석자 Entity
 * (receipt_trip_meeting_attendee 테이블)
 *
 * attendee_type     : '내부' | '외부'  (인원 구분 — 기존 컬럼)
 * participation_type: '출장' | '회의'  (참여 구분 — 마이그레이션 추가 컬럼)
 */
@Entity
@Table(name = "receipt_trip_meeting_attendee", schema = "erp", indexes = {
        @Index(name = "idx_rtm_attendee_rtm",           columnList = "receipt_trip_meeting_idx"),
        @Index(name = "idx_rtm_attendee_user",          columnList = "user_idx"),
        @Index(name = "idx_rtm_attendee_participation", columnList = "participation_type"),
        @Index(name = "idx_rtm_attendee_deleted",       columnList = "is_deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripMeetingAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_meeting_attendee_seq")
    @SequenceGenerator(name = "receipt_trip_meeting_attendee_seq",
                       sequenceName = "erp.receipt_trip_meeting_attendee_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "receipt_trip_meeting_idx", nullable = false)
    private Long receiptTripMeetingIdx;

    /** '내부' 또는 '외부' */
    @Column(name = "attendee_type", nullable = false, length = 10)
    private String attendeeType;

    /** '출장' 또는 '회의' */
    @Column(name = "participation_type", length = 10)
    private String participationType;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** users.idx (내부) 또는 external_persons.idx (외부) */
    @Column(name = "user_idx")
    private Long userIdx;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    // ─── 관계 매핑 ──────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_trip_meeting_idx", insertable = false, updatable = false)
    private ReceiptTripMeeting receiptTripMeeting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;

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
