package com.pinecni.erp.api.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.dto.RenderedMessage;
import com.pinecni.erp.api.notification.event.NotificationEnqueueRequestedEvent;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.entity.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Enqueue 구현체. 행 INSERT + 트랜잭션 커밋 후 이벤트 발행.
 *
 * <p>설계 원칙:
 * <ul>
 *   <li>외부인 수신자는 행도 안 만듦 (행 자체가 발송 시도였다는 사실을 기록할 가치가 작아 노이즈)</li>
 *   <li>구독 OFF / 시스템 OFF 같은 게이트 검사는 dispatcher 가 담당 — 행은 만들고 SKIPPED 로 마크</li>
 *   <li>title/body/linkUrl 은 enqueue 시점에 렌더 — 이후 템플릿이 변경되어도 발송 시점 문구는 유지</li>
 *   <li>payload_json 에 변수맵을 보관해 디버깅·감사 추적 가능</li>
 *   <li>variables 의 deepLink/retryLink/originalDeepLink 가 path-only ('/' 시작) 이면
 *       notification.link.base-url 을 prepend 해 절대 URL 로 만든다 — Mattermost 메시지에서 클릭 가능하게.</li>
 * </ul>
 */
@Slf4j
@Service
public class NotificationEnqueueServiceImpl implements NotificationEnqueueService {

    /** 알림 메시지 안의 링크 prefix — Mattermost 에서 클릭하면 그룹웨어로 절대 URL 로 이동 */
    private static final String[] URL_VARIABLE_KEYS = { "deepLink", "retryLink", "originalDeepLink" };

    private final NotificationRepository notificationRepository;
    private final NotificationRenderer renderer;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;
    private final String linkBaseUrl;

    public NotificationEnqueueServiceImpl(NotificationRepository notificationRepository,
                                          NotificationRenderer renderer,
                                          ApplicationEventPublisher eventPublisher,
                                          ObjectMapper objectMapper,
                                          @Value("${notification.link.base-url:http://localhost:8080}")
                                          String linkBaseUrl) {
        this.notificationRepository = notificationRepository;
        this.renderer = renderer;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
        // 끝의 / 제거 (path 가 / 로 시작하므로 중복 방지)
        this.linkBaseUrl = linkBaseUrl != null && linkBaseUrl.endsWith("/")
                ? linkBaseUrl.substring(0, linkBaseUrl.length() - 1)
                : linkBaseUrl;
    }

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

        // 변수 사본 + 모든 URL 변수에 base-url prepend (절대 URL 화)
        Map<String, Object> finalVars = withAbsoluteUrls(nullSafe(cmd.getVariables()));

        // 템플릿 렌더 (실패 시 enqueue 자체 실패 — 호출측이 트랜잭션 롤백 결정)
        RenderedMessage rendered;
        try {
            rendered = renderer.render(cmd.getNotificationType(), finalVars);
        } catch (Exception e) {
            log.error("[Enqueue] 템플릿 렌더 실패 — type={}, error={}",
                    cmd.getNotificationType(), e.getMessage());
            return insertedIdxs;
        }

        String payloadJson = serializePayload(finalVars);

        for (String channel : cmd.getChannels()) {
            String dedupKey = buildDedupKey(cmd.getDedupKey(), channel);

            if (dedupKey != null
                    && notificationRepository.findByDedupKey(dedupKey).isPresent()) {
                log.debug("[Enqueue] 중복 SKIP — dedupKey={}", dedupKey);
                continue;
            }

            // 도메인 코드가 정확한 URL 을 알고 있을 때 (variables.deepLink) 그걸 우선 사용 —
            // 템플릿 link_template 의 변수 매핑이 실제 라우팅과 맞지 않는 케이스 회피.
            // (finalVars 의 deepLink 는 이미 절대 URL — withAbsoluteUrls 가 prefix 적용)
            String linkUrl = rendered.linkUrl();
            Object deepLinkOverride = finalVars.get("deepLink");
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

            // 트랜잭션 커밋 후 디스패치 트리거 — 리스너가 AFTER_COMMIT 으로 받음
            eventPublisher.publishEvent(new NotificationEnqueueRequestedEvent(saved.getIdx()));

            log.debug("[Enqueue] 행 생성 — idx={}, type={}, channel={}, recipientUserIdx={}",
                    saved.getIdx(), cmd.getNotificationType(), channel, cmd.getRecipientUserIdx());
        }

        return insertedIdxs;
    }

    // =========================================================================
    // 헬퍼
    // =========================================================================

    private static Map<String, Object> nullSafe(Map<String, Object> map) {
        return map == null ? Map.of() : map;
    }

    /**
     * URL 성격 변수 (deepLink/retryLink/originalDeepLink) 가 path-only ('/' 시작) 면
     * base-url 을 prepend 해 절대 URL 로 만든다. 이미 절대 URL (http:// 시작) 이면 손대지 않음.
     */
    private Map<String, Object> withAbsoluteUrls(Map<String, Object> source) {
        if (source == null || source.isEmpty()) return Map.of();
        Map<String, Object> copy = new LinkedHashMap<>(source);
        if (linkBaseUrl == null || linkBaseUrl.isBlank()) return copy;
        for (String key : URL_VARIABLE_KEYS) {
            Object v = copy.get(key);
            if (v instanceof String s && s.startsWith("/")) {
                copy.put(key, linkBaseUrl + s);
            }
        }
        return copy;
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

    /** 채널코드(C21) → 사람이 읽는 dedup suffix */
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
