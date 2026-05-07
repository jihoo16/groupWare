package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 관리자 발송 이력 한 행 — /admin/notifications/logs 화면용.
 */
@Getter
@Builder
public class AdminLogEntryDto {

    private final Long          idx;
    private final String        notificationType;     // C19
    private final String        notificationTypeName; // 한글명
    private final String        channel;              // C21
    private final String        status;               // C20
    private final String        statusName;           // 한글명
    private final Integer       retryCount;
    private final String        lastError;
    private final String        mmPostId;
    private final LocalDateTime createdAt;
    private final LocalDateTime sentAt;
    private final LocalDateTime nextAttemptAt;

    private final Long          recipientUserIdx;
    private final String        recipientName;
    private final String        recipientEmpId;

    private final Long          actorUserIdx;
    private final String        actorName;

    private final Long          documentIdx;
    private final String        documentNo;

    /** C1914 fallback 이 이미 발행됐는지 (root 당 1건 한도) */
    private final boolean       actorFallbackEmitted;
}
