package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 사용자별 알림 종류 × 채널 ON/OFF 설정.
 *
 * <p>한 사용자가 한 알림 종류에 대해 채널 (C2101 MM, C2103 INWEB) 마다 1행.
 * 사용자가 /settings 알림 탭에서 직접 변경.
 */
@Entity
@Table(name = "notification_subscriptions", schema = "erp",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_nsub_user_type_channel",
                columnNames = {"user_idx", "notification_type", "channel"}),
        indexes = @Index(name = "idx_nsub_user", columnList = "user_idx"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "notification_subscriptions_seq")
    @SequenceGenerator(name = "notification_subscriptions_seq",
            sequenceName = "erp.notification_subscriptions_sequence",
            allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    /** C19 알림유형 */
    @Column(name = "notification_type", nullable = false, length = 10)
    private String notificationType;

    /** C21 채널 (기본 C2101 MM) */
    @Column(name = "channel", nullable = false, length = 10)
    private String channel;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled;

    @Column(name = "quiet_hours_start")
    private LocalTime quietHoursStart;

    @Column(name = "quiet_hours_end")
    private LocalTime quietHoursEnd;

    /** TRUE 면 OFF/방해금지여도 무조건 발송 (시스템공지 C1915 등) */
    @Column(name = "is_force_send", nullable = false)
    private Boolean isForceSend;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;
}
