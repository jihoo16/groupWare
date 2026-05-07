package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * 알림 발송 이력 (메인 테이블).
 *
 * <p>알림 1건 = 1행 (한 이벤트가 채널 N개로 fan-out 되면 N행).
 * 발송 전(대기), 발송 성공, 발송 실패, 만료 모두 기록되어 화면에서 조회·재시도 가능.
 */
@Entity
@Table(name = "notifications", schema = "erp", indexes = {
        @Index(name = "idx_n_recipient",    columnList = "recipient_user_idx, created_at DESC"),
        @Index(name = "idx_n_status",       columnList = "status"),
        @Index(name = "idx_n_target",       columnList = "target_type, target_idx"),
        @Index(name = "idx_n_document",     columnList = "document_idx"),
        @Index(name = "idx_n_type_created", columnList = "notification_type, created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "notifications_seq")
    @SequenceGenerator(name = "notifications_seq",
            sequenceName = "erp.notifications_sequence",
            allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** C19 알림유형 */
    @Column(name = "notification_type", nullable = false, length = 10)
    private String notificationType;

    /** C21 채널 (기본 C2101 MM DM) */
    @Column(name = "channel", nullable = false, length = 10)
    private String channel;

    /** 외부인 알림이면 NULL */
    @Column(name = "recipient_user_idx")
    private Long recipientUserIdx;

    @Column(name = "is_external_recipient", nullable = false)
    private Boolean isExternalRecipient;

    /** 알림을 발생시킨 사람 (서명자/처리자 등). retry 권한키로도 사용 */
    @Column(name = "actor_user_idx")
    private Long actorUserIdx;

    /** C17 감사대상유형 (예: C1702 signature_requests) */
    @Column(name = "target_type", length = 10)
    private String targetType;

    @Column(name = "target_idx")
    private Long targetIdx;

    /** 비정규화 — 관련 결재문서 idx (조회 성능용) */
    @Column(name = "document_idx")
    private Long documentIdx;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", columnDefinition = "jsonb")
    private String payloadJson;

    /** C20 발송상태 (기본 C2001 PENDING) */
    @Column(name = "status", nullable = false, length = 10)
    private String status;

    @Column(name = "mm_post_id", length = 50)
    private String mmPostId;

    @Column(name = "mm_channel_id", length = 50)
    private String mmChannelId;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "last_error_code", length = 50)
    private String lastErrorCode;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    /** 멱등 키 (예: SIGREQ:1234:MM) — UNIQUE WHERE NOT NULL */
    @Column(name = "dedup_key", length = 100)
    private String dedupKey;

    /** retry/C1914 cascade 의 root 알림 idx. 본인이 root 면 NULL */
    @Column(name = "original_notification_idx")
    private Long originalNotificationIdx;

    /** INWEB(C2103) 행에서만 의미 — 사용자가 인박스에서 읽은 시각 */
    @Column(name = "read_at")
    private LocalDateTime readAt;
}
