package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationRetryInfoDto {

    private final Long          idx;
    private final String        notificationType;
    private final String        notificationTypeName;
    private final String        title;
    private final String        body;
    private final String        linkUrl;

    private final Long          recipientUserIdx;
    private final String        recipientName;
    private final String        recipientEmpId;
    private final String        recipientDept;

    private final Long          documentIdx;
    private final String        documentNo;
    private final String        documentTitle;

    private final LocalDateTime createdAt;
    private final LocalDateTime lastAttemptAt;     // updatedAt
    private final Integer       attemptedRetryCount; // 자동 재시도 횟수
    private final String        failureReason;

    private final int           userRetryCount;    // root 당 수동 재시도 누적
    private final int           userRetryMax;
    private final boolean       canRetry;
}
