package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 캘린더 참석자 Entity
 */
@Entity
@Table(name = "calendar_participant", schema = "erp",
        uniqueConstraints = @UniqueConstraint(name = "uk_event_user", columnNames = {"event_idx", "user_idx"}),
        indexes = {
                @Index(name = "idx_participant_event", columnList = "event_idx"),
                @Index(name = "idx_participant_user", columnList = "user_idx"),
                @Index(name = "idx_participant_status", columnList = "participation_status")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "calendar_participant_sequence")
    @SequenceGenerator(name = "calendar_participant_sequence", sequenceName = "erp.calendar_participant_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "event_idx", nullable = false)
    private Long eventIdx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "user_name", nullable = false, length = 50)
    private String userName;

    @Column(name = "participation_status", length = 20)
    private String participationStatus = "PENDING";

    @Column(name = "receive_notification", length = 1)
    private String receiveNotification = "Y";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_idx", insertable = false, updatable = false)
    private CalendarEvent event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_idx", insertable = false, updatable = false)
    private User user;
}
