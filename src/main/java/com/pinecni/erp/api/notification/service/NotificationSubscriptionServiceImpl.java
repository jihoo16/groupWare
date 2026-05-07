package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.repository.NotificationSubscriptionRepository;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.NotificationSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSubscriptionServiceImpl implements NotificationSubscriptionService {

    private static final String  GROUP_NOTIFICATION_TYPE = "C19";
    private static final String  TYPE_FORCE_SEND         = "C1915";  // 시스템공지만 강제발송
    /** 사용자 구독 채널 — C2102 메신저채널은 시스템 측 전용 (사용자 구독 대상 아님) */
    private static final String[] CHANNELS               = { "C2101", "C2103" };
    private static final Long    SYSTEM_USER_IDX         = 1L;

    private final NotificationSubscriptionRepository subscriptionRepository;
    private final CodeRepository codeRepository;

    @Override
    @Transactional
    public void createDefaultsFor(Long userIdx) {
        if (userIdx == null) return;

        List<Code> types = codeRepository.findByGroupCode(GROUP_NOTIFICATION_TYPE).stream()
                .filter(c -> "Y".equalsIgnoreCase(c.getUseYn()))
                .toList();
        if (types.isEmpty()) {
            log.warn("[Subscription Defaults] C19 알림유형 코드가 없어 SKIP — userIdx={}", userIdx);
            return;
        }

        int inserted = 0;
        int skipped  = 0;
        for (Code type : types) {
            for (String channel : CHANNELS) {
                if (subscriptionRepository.findByUserIdxAndNotificationTypeAndChannel(
                        userIdx, type.getCode(), channel).isPresent()) {
                    skipped++;
                    continue;
                }
                NotificationSubscription sub = NotificationSubscription.builder()
                        .userIdx(userIdx)
                        .notificationType(type.getCode())
                        .channel(channel)
                        .isEnabled(true)
                        .isForceSend(TYPE_FORCE_SEND.equals(type.getCode()))
                        .createdUserIdx(SYSTEM_USER_IDX)
                        .build();
                subscriptionRepository.save(sub);
                inserted++;
            }
        }

        log.info("[Subscription Defaults] userIdx={} 에게 알림 구독 기본값 생성 — inserted={}, skipped={}",
                userIdx, inserted, skipped);
    }
}
