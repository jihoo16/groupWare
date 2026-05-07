package com.pinecni.erp.api.notification.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

/**
 * 관리자 화면 저장 요청.
 *
 * <p>{@code botToken} 은 사용자가 [봇 토큰 변경] 시에만 새 평문을 보냄.
 * null 또는 빈 문자열이면 기존 토큰을 유지.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = "botToken")  // 로그에 평문 토큰 절대 노출 금지
public class NotificationSettingsUpdateRequest {

    private String serverUrl;
    private String botUsername;
    private String defaultChannelId;

    /** 새 평문 토큰. 미입력이면 기존 값 유지. */
    private String botToken;

    private Boolean isEnabled;
    private Integer maxRetryCount;
    private Integer retryBackoffSeconds;
    private Integer expireAfterMinutes;

    /** 일시정지 종료 시각. null 로 보내면 즉시 해제. */
    private LocalDateTime dispatcherPausedUntil;
}
