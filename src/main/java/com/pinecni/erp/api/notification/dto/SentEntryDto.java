package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 본인이 발송한 알림 한 행 — /notifications 의 [보낸 알림] 탭용.
 */
@Getter
@Builder
public class SentEntryDto {

    private final Long          idx;
    private final String        notificationType;
    private final String        notificationTypeName;

    /** C2101 메신저DM / C2102 메신저채널 / C2103 인박스 */
    private final String        channel;
    private final String        channelLabel;

    private final String        title;
    private final String        body;
    private final String        linkUrl;

    private final Long          recipientUserIdx;
    private final String        recipientName;
    private final String        recipientEmpId;

    private final String        status;
    private final String        statusName;
    private final Integer       retryCount;
    private final String        lastError;

    private final LocalDateTime createdAt;
    private final LocalDateTime sentAt;
}
