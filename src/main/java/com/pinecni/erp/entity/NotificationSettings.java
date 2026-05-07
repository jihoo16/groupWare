package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Mattermost 알림 시스템 전체 설정 (싱글톤 idx=1).
 *
 * <p>봇 접속 정보 · 재시도 · 만료 · 일시정지 등을 한 행에 모음.
 * 관리자 화면 (/admin/notifications) 에서 수정.
 *
 * <p>DDL CHECK 제약(idx=1) 이 걸려 있으므로 행은 항상 1개.
 */
@Entity
@Table(name = "notification_settings", schema = "erp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSettings {

    public static final Long SINGLETON_IDX = 1L;

    @Id
    @Column(name = "idx")
    private Long idx;

    @Column(name = "server_url", nullable = false, length = 200)
    private String serverUrl;

    @Column(name = "bot_user_id", nullable = false, length = 50)
    private String botUserId;

    @Column(name = "bot_username", nullable = false, length = 50)
    private String botUsername;

    /** Java AES-256-GCM 암호화 결과 (Base64). 빈 문자열 = 미설정 placeholder. */
    @Column(name = "bot_token_enc", nullable = false, columnDefinition = "TEXT")
    private String botTokenEnc;

    @Column(name = "default_channel_id", length = 50)
    private String defaultChannelId;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled;

    @Column(name = "max_retry_count", nullable = false)
    private Integer maxRetryCount;

    @Column(name = "retry_backoff_seconds", nullable = false)
    private Integer retryBackoffSeconds;

    @Column(name = "expire_after_minutes", nullable = false)
    private Integer expireAfterMinutes;

    @Column(name = "dispatcher_paused_until")
    private LocalDateTime dispatcherPausedUntil;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;
}
