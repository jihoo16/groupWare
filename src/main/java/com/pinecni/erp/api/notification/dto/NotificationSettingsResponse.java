package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 관리자 화면용 시스템 설정 조회 응답.
 *
 * <p>봇 토큰 평문은 절대 포함하지 않음. 등록 여부는 {@link #botTokenSet} 으로만 노출.
 */
@Getter
@Builder
public class NotificationSettingsResponse {

    private final String  serverUrl;
    private final String  botUserId;
    private final String  botUsername;
    private final String  defaultChannelId;

    /** 봇 토큰이 등록되어 있는지 (평문은 절대 노출하지 않음) */
    private final boolean botTokenSet;

    private final boolean       isEnabled;
    private final int           maxRetryCount;
    private final int           retryBackoffSeconds;
    private final int           expireAfterMinutes;
    private final LocalDateTime dispatcherPausedUntil;

    private final LocalDateTime updatedAt;
    private final Long          updatedUserIdx;
}
