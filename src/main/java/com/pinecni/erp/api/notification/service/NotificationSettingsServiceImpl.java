package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.dto.NotificationSettingsResponse;
import com.pinecni.erp.api.notification.dto.NotificationSettingsUpdateRequest;
import com.pinecni.erp.api.notification.repository.NotificationSettingsRepository;
import com.pinecni.erp.api.notification.util.BotTokenCipher;
import com.pinecni.erp.entity.NotificationSettings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSettingsServiceImpl implements NotificationSettingsService {

    private final NotificationSettingsRepository repository;
    private final BotTokenCipher tokenCipher;

    @Override
    @Transactional(readOnly = true)
    public NotificationSettingsResponse getSettings() {
        return toResponse(loadSingleton());
    }

    @Override
    @Transactional
    public NotificationSettingsResponse updateSettings(NotificationSettingsUpdateRequest req,
                                                       Long currentUserIdx) {
        NotificationSettings entity = loadSingleton();

        if (req.getServerUrl() != null) {
            entity.setServerUrl(req.getServerUrl().trim());
        }
        if (req.getBotUsername() != null) {
            entity.setBotUsername(req.getBotUsername().trim());
        }
        if (req.getDefaultChannelId() != null) {
            String trimmed = req.getDefaultChannelId().trim();
            entity.setDefaultChannelId(trimmed.isEmpty() ? null : trimmed);
        }
        if (req.getIsEnabled() != null) {
            entity.setIsEnabled(req.getIsEnabled());
        }
        if (req.getMaxRetryCount() != null) {
            entity.setMaxRetryCount(req.getMaxRetryCount());
        }
        if (req.getRetryBackoffSeconds() != null) {
            entity.setRetryBackoffSeconds(req.getRetryBackoffSeconds());
        }
        if (req.getExpireAfterMinutes() != null) {
            entity.setExpireAfterMinutes(req.getExpireAfterMinutes());
        }
        // dispatcherPausedUntil 은 null 도 의미가 있음 (즉시 해제) → 항상 반영
        entity.setDispatcherPausedUntil(req.getDispatcherPausedUntil());

        // 토큰은 새 값이 들어왔을 때만 암호화해서 교체
        if (req.getBotToken() != null && !req.getBotToken().isBlank()) {
            entity.setBotTokenEnc(tokenCipher.encrypt(req.getBotToken()));
            log.info("봇 토큰 갱신 — userIdx={}", currentUserIdx);
        }

        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedUserIdx(currentUserIdx);

        NotificationSettings saved = repository.save(entity);
        return toResponse(saved);
    }

    // =========================================================================
    // 헬퍼
    // =========================================================================

    private NotificationSettings loadSingleton() {
        return repository.findById(NotificationSettings.SINGLETON_IDX)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "알림 시스템 설정 행이 존재하지 않습니다. notification_03_seeds.sql 실행 필요."));
    }

    private NotificationSettingsResponse toResponse(NotificationSettings e) {
        return NotificationSettingsResponse.builder()
                .serverUrl(e.getServerUrl())
                .botUserId(e.getBotUserId())
                .botUsername(e.getBotUsername())
                .defaultChannelId(e.getDefaultChannelId())
                .botTokenSet(tokenCipher.isPresent(e.getBotTokenEnc()))
                .isEnabled(e.getIsEnabled() != null ? e.getIsEnabled() : Boolean.FALSE)
                .maxRetryCount(e.getMaxRetryCount() != null ? e.getMaxRetryCount() : 0)
                .retryBackoffSeconds(e.getRetryBackoffSeconds() != null ? e.getRetryBackoffSeconds() : 0)
                .expireAfterMinutes(e.getExpireAfterMinutes() != null ? e.getExpireAfterMinutes() : 0)
                .dispatcherPausedUntil(e.getDispatcherPausedUntil())
                .updatedAt(e.getUpdatedAt())
                .updatedUserIdx(e.getUpdatedUserIdx())
                .build();
    }
}
