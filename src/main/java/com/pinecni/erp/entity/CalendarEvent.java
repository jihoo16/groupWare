package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 캘린더 이벤트 Entity
 */
@Entity
@Table(name = "calendar_event", schema = "erp", indexes = {
        @Index(name = "idx_event_dates", columnList = "start_date, end_date"),
        @Index(name = "idx_event_type", columnList = "event_type"),
        @Index(name = "idx_event_creator", columnList = "creator_idx"),
        @Index(name = "idx_event_approval", columnList = "approval_idx"),
        @Index(name = "idx_event_group", columnList = "group_id"),
        @Index(name = "idx_event_status", columnList = "status"),
        @Index(name = "idx_event_deleted", columnList = "deleted_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "calendar_event_sequence")
    @SequenceGenerator(name = "calendar_event_sequence", sequenceName = "erp.calendar_event_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "event_title", nullable = false, length = 200)
    private String eventTitle;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "event_description", columnDefinition = "TEXT")
    private String eventDescription;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "is_all_day")
    private Boolean isAllDay = false;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "creator_idx", nullable = false)
    private Long creatorIdx;

    @Column(name = "creator_name", nullable = false, length = 50)
    private String creatorName;

    @Column(name = "approval_idx")
    private Long approvalIdx;

    @Column(name = "group_id", length = 100)
    private String groupId;

    @Column(name = "notification_yn", length = 1)
    private String notificationYn = "N";

    @Column(name = "notification_minutes")
    private Integer notificationMinutes;

    @Column(name = "is_recurring")
    private Boolean isRecurring = false;

    @Column(name = "recurring_type", length = 20)
    private String recurringType;

    @Column(name = "recurring_end_date")
    private LocalDate recurringEndDate;

    @Column(name = "status", length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_idx", insertable = false, updatable = false)
    private User creator;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CalendarParticipant> participants = new ArrayList<>();
}
