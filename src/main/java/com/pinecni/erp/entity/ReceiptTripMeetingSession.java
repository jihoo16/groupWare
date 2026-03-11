package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 출장+회의 회의 세션 Entity
 * - 한 건의 출장에 N건의 회의를 지원하기 위한 세션 단위 테이블
 * - 컬럼 구성은 receipt_meeting 과 통일 (출장 전용: receipt_trip_meeting_idx, display_order)
 */
@Entity
@Table(name = "receipt_trip_meeting_session", schema = "erp", indexes = {
        @Index(name = "idx_rtms_trip_meeting", columnList = "receipt_trip_meeting_idx"),
        @Index(name = "idx_rtms_order",        columnList = "receipt_trip_meeting_idx, display_order")
})
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripMeetingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_meeting_session_seq")
    @SequenceGenerator(name = "receipt_trip_meeting_session_seq",
                       sequenceName = "erp.receipt_trip_meeting_session_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 상위 출장+회의 IDX (FK → receipt_trip_meeting.idx) */
    @Column(name = "receipt_trip_meeting_idx", nullable = false)
    private Long receiptTripMeetingIdx;

    /** 세션 표시 순서 (0부터 시작) */
    @Builder.Default
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    /** 회의 작성자 user idx (receipt_meeting.author_idx 와 동일) */
    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    /** 회의 일자 (receipt_meeting.meeting_date 와 동일) */
    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    /** 회의 시작 시간 (receipt_meeting.start_time 와 동일) */
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    /** 회의 종료 시간 (receipt_meeting.end_time 와 동일) */
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    /** 회의 장소 (출장지 자동 상속, receipt_meeting.location 와 동일) */
    @Column(name = "location", nullable = false, length = 200)
    private String location;

    /** 회의비 합계 (원) */
    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    /** 회의 목적 / 주제 */
    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    /** 회의 주요 내용 (회의록 본문) */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

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
