package com.pinecni.erp.api.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.dto.RenderedMessage;
import com.pinecni.erp.api.notification.event.NotificationEnqueueRequestedEvent;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Enqueue 구현체. 행 INSERT + 트랜잭션 커밋 후 이벤트 발행.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEnqueueServiceImpl implements NotificationEnqueueService {

    private final NotificationRepository notificationRepository;
    private final NotificationRenderer renderer;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public List<Long> enqueue(NotificationCreateCommand cmd) {
        List<Long> insertedIdxs = new ArrayList<>();

        if (cmd == null || cmd.getNotificationType() == null) {
            log.warn("[Enqueue] notificationType 누락 — SKIP");
            return insertedIdxs;
        }
        if (cmd.getChannels() == null || cmd.getChannels().isEmpty()) {
            log.warn("[Enqueue] 채널 미지정 — SKIP (type={})", cmd.getNotificationType());
            return insertedIdxs;
        }
        if (cmd.isExternalRecipient()) {
            log.debug("[Enqueue] 외부인 수신자 — 행 생성 SKIP (type={})", cmd.getNotificationType());
            return insertedIdxs;
        }

        RenderedMessage rendered;
        try {
            rendered = renderer.render(cmd.getNotificationType(), nullSafe(cmd.getVariables()));
        } catch (Exception e) {
            log.error("[Enqueue] 템플릿 렌더 실패 — type={}, error={}",
                    cmd.getNotificationType(), e.getMessage());
            return insertedIdxs;
        }

        String payloadJson = serializePayload(cmd.getVariables());

        for (String channel : cmd.getChannels()) {
            String dedupKey = buildDedupKey(cmd.getDedupKey(), channel);

            if (dedupKey != null
                    && notificationRepository.findByDedupKey(dedupKey).isPresent()) {
                log.debug("[Enqueue] 중복 SKIP — dedupKey={}", dedupKey);
                continue;
            }

            // 도메인 코드가 정확한 URL 을 알고 있을 때 (variables.deepLink) 그걸 우선 사용 —
            // 템플릿 link_template 의 변수 매핑이 실제 라우팅과 맞지 않는 케이스 회피.
            String linkUrl = rendered.linkUrl();
            Object deepLinkOverride = cmd.getVariables() != null
                    ? cmd.getVariables().get("deepLink") : null;
            if (deepLinkOverride instanceof String s && !s.isBlank()) {
                linkUrl = s;
            }

            Notification n = Notification.builder()
                    .notificationType(cmd.getNotificationType())
                    .channel(channel)
                    .recipientUserIdx(cmd.getRecipientUserIdx())
                    .isExternalRecipient(false)
                    .actorUserIdx(cmd.getActorUserIdx())
                    .targetType(cmd.getTargetType())
                    .targetIdx(cmd.getTargetIdx())
                    .documentIdx(cmd.getDocumentIdx())
                    .title(rendered.title())
                    .body(rendered.body())
                    .linkUrl(linkUrl)
                    .payloadJson(payloadJson)
                    .status("C2001")  // PENDING
                    .retryCount(0)
                    .dedupKey(dedupKey)
                    .originalNotificationIdx(cmd.getOriginalNotificationIdx())
                    .createdUserIdx(cmd.getActorUserIdx())
                    .build();

            Notification saved = notificationRepository.save(n);
            insertedIdxs.add(saved.getIdx());

            eventPublisher.publishEvent(new NotificationEnqueueRequestedEvent(saved.getIdx()));

            log.debug("[Enqueue] 행 생성 — idx={}, type={}, channel={}, recipientUserIdx={}",
                    saved.getIdx(), cmd.getNotificationType(), channel, cmd.getRecipientUserIdx());
        }

        return insertedIdxs;
    }

    private static Map<String, Object> nullSafe(Map<String, Object> map) {
        return map == null ? Map.of() : map;
    }

    private String serializePayload(Map<String, Object> variables) {
        if (variables == null || variables.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(variables);
        } catch (JsonProcessingException e) {
            log.warn("[Enqueue] payload_json 직렬화 실패 — error={}", e.getMessage());
            return null;
        }
    }

    private static String buildDedupKey(String baseKey, String channelCode) {
        if (baseKey == null) return null;
        String suffix = switch (channelCode) {
            case "C2101" -> "MM";
            case "C2102" -> "MMCH";
            case "C2103" -> "INWEB";
            default      -> channelCode;
        };
        return baseKey + ":" + suffix;
    }
}
