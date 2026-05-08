package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 인박스 한 행. 사용자 화면용으로 필수 필드만 포함.
 */
@Getter
@Builder
public class InboxEntryDto {

    private final Long          idx;
    private final String        notificationType;     // C19
    private final String        notificationTypeName; // 한글명
    private final String        title;
    private final String        body;
    private final String        linkUrl;
    private final LocalDateTime createdAt;
    private final LocalDateTime readAt;     // null 이면 안 읽음

    /**
     * 서명요청 알림(C1901)에 한해 채워짐.
     * "COMPLETED" — 이미 서명 완료, "PENDING" — 아직 서명 전.
     * null — 서명 알림이 아니거나 대상 행이 사라짐.
     */
    private final String        signatureStatus;
}
