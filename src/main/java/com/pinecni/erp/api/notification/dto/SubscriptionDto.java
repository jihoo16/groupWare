package com.pinecni.erp.api.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionDto {

    /** C19 알림유형 */
    private String notificationType;

    /** C21 채널 (C2101 MM, C2103 INWEB) */
    private String channel;

    /** 사용자가 받을지 여부 (force_send 행은 무시됨) */
    private Boolean isEnabled;

    /** TRUE 면 사용자가 끌 수 없음 — 화면에서 잠긴 행 표시 */
    private Boolean isForceSend;
}
