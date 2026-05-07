package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.dto.NotificationSettingsResponse;
import com.pinecni.erp.api.notification.dto.NotificationSettingsUpdateRequest;

public interface NotificationSettingsService {

    /** 시스템 설정 1행 조회. 봇 토큰 평문은 절대 응답에 포함하지 않음. */
    NotificationSettingsResponse getSettings();

    /**
     * 시스템 설정 저장.
     *
     * <p>봇 토큰은 {@code req.botToken} 이 비어있지 않을 때만 새 값으로 암호화 저장.
     * 비어 있으면 기존 토큰 유지.
     */
    NotificationSettingsResponse updateSettings(NotificationSettingsUpdateRequest req,
                                                Long currentUserIdx);
}
