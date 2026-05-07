package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.api.notification.repository.NotificationSettingsRepository;
import com.pinecni.erp.entity.Notification;
import com.pinecni.erp.entity.NotificationSettings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 재시도 + TTL 만료 처리 스케줄러.
 *
 * <p>30 초마다 실행:
 * <ol>
 *   <li>RETRY_WAIT 행 중 next_attempt_at 이 도래한 것을 디스패처에 다시 넘김</li>
 *   <li>PENDING/RETRY_WAIT 인데 created_at + expire_after_minutes 가 지난 행은 EXPIRED 처리</li>
 * </ol>
 *
 * <p>한 사이클 안에서 행별로 처리하므로 일부 실패가 다른 행 처리에 영향 안 줌.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationRetryScheduler {

    private final NotificationRepository notificationRepository;
    private final NotificationSettingsRepository settingsRepository;
    private final NotificationDispatcher dispatcher;

    @Scheduled(fixedDelayString = "${notification.retry.fixed-delay-ms:30000}")
    public void cycle() {
        LocalDateTime now = LocalDateTime.now();

        // 1) 만료 처리 — 시의성 알림이 늦게 도착하지 않도록
        expireOverdue(now);

        // 2) 재시도 — next_attempt_at 도래한 RETRY_WAIT 행
        retryReady(now);
    }

    private void expireOverdue(LocalDateTime now) {
        NotificationSettings settings = settingsRepository.findById(NotificationSettings.SINGLETON_IDX)
                .orElse(null);
        int expireMin = settings != null && settings.getExpireAfterMinutes() != null
                ? settings.getExpireAfterMinutes() : 1440;
        LocalDateTime cutoff = now.minusMinutes(expireMin);

        List<Notification> overdue = notificationRepository.findExpired(cutoff);
        if (overdue.isEmpty()) return;

        log.info("[RetryScheduler] 만료 처리 — {}건 (cutoff={})", overdue.size(), cutoff);
        for (Notification n : overdue) {
            try {
                // status=EXPIRED 유지 + actor 에게 C1914 fallback (cascade 방지 로직은 dispatcher 에 있음)
                dispatcher.markExpiredAndCascade(n,
                        "유효기간(" + expireMin + "분) 초과로 발송 포기.");
            } catch (Exception e) {
                log.error("[RetryScheduler] 만료 처리 실패 — idx={}", n.getIdx(), e);
            }
        }
    }

    private void retryReady(LocalDateTime now) {
        List<Notification> ready = notificationRepository.findRetryReady(now);
        if (ready.isEmpty()) return;

        log.info("[RetryScheduler] 재시도 — {}건", ready.size());
        for (Notification n : ready) {
            try {
                dispatcher.dispatch(n.getIdx());
            } catch (Exception e) {
                log.error("[RetryScheduler] 재시도 디스패치 실패 — idx={}", n.getIdx(), e);
            }
        }
    }
}
