package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.client.MattermostClient;
import com.pinecni.erp.api.notification.client.MattermostClient.MattermostApiException;
import com.pinecni.erp.api.notification.client.MattermostClient.MattermostErrorKind;
import com.pinecni.erp.api.notification.client.MattermostClient.MmPost;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.api.notification.repository.NotificationSettingsRepository;
import com.pinecni.erp.api.notification.repository.NotificationSubscriptionRepository;
import com.pinecni.erp.api.notification.service.NotificationUserLinkResolver.ResolvedLink;
import com.pinecni.erp.api.notification.util.BotTokenCipher;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Notification;
import com.pinecni.erp.entity.NotificationSettings;
import com.pinecni.erp.entity.NotificationSubscription;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 알림 디스패치 — 한 행을 실제로 발송 시도하는 작업.
 *
 * <p>호출 진입점:
 * <ul>
 *   <li>{@link NotificationEnqueueListener} (AFTER_COMMIT 후 비동기, 신규 enqueue 직후)</li>
 *   <li>{@link NotificationRetryScheduler} (스케줄링, RETRY_WAIT 행 재시도)</li>
 * </ul>
 *
 * <p>설계 원칙:
 * <ul>
 *   <li>긴 트랜잭션 금지 — MM HTTP 호출 동안 DB 트랜잭션 안 잡음. mark* 헬퍼만 짧게 @Transactional</li>
 *   <li>게이트 검사 우선 — 시스템 OFF / 일시정지 / 외부인 / 구독 OFF / C1914 cascade 모두 발송 전에 차단</li>
 *   <li>C1914 fallback — 영구 실패 시 actor 에게 한 번만, root 당 1건 한도</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDispatcher {

    private static final String STATUS_PENDING    = "C2001";
    private static final String STATUS_SENT       = "C2002";
    private static final String STATUS_SKIPPED    = "C2003";
    private static final String STATUS_FAILED     = "C2004";
    private static final String STATUS_RETRY_WAIT = "C2005";
    private static final String STATUS_EXPIRED    = "C2006";

    private static final String CHANNEL_MM     = "C2101";
    private static final String CHANNEL_MM_CH  = "C2102";
    private static final String CHANNEL_INWEB  = "C2103";

    private static final String TYPE_C1914 = "C1914";

    /** 시스템 사용자 (자동 처리 표시 — VacationScheduler 컨벤션과 동일) */
    private static final Long SYSTEM_USER_IDX = 1L;

    private static final DateTimeFormatter HUMAN_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final NotificationRepository notificationRepository;
    private final NotificationSettingsRepository settingsRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final NotificationUserLinkResolver userLinkResolver;
    private final NotificationEnqueueService enqueueService;
    private final MattermostClient mmClient;
    private final BotTokenCipher tokenCipher;
    private final UserRepository userRepository;

    /**
     * 한 알림 행을 발송 시도한다. 트랜잭션 경계 작게 — 외부 호출 동안 DB 락 안 잡음.
     */
    public void dispatch(Long notificationIdx) {
        Notification n = notificationRepository.findById(notificationIdx).orElse(null);
        if (n == null) {
            log.debug("[Dispatch] 행 없음 — idx={}", notificationIdx);
            return;
        }
        if (!isProcessable(n.getStatus())) {
            log.debug("[Dispatch] 처리 대상 아님 — idx={}, status={}", notificationIdx, n.getStatus());
            return;
        }

        NotificationSettings settings = settingsRepository.findById(NotificationSettings.SINGLETON_IDX)
                .orElse(null);
        if (settings == null) {
            log.error("[Dispatch] 설정 행 없음 — 디스패치 중단");
            return;
        }

        // 게이트 0-A: 시스템 OFF (Kill Switch)
        if (!Boolean.TRUE.equals(settings.getIsEnabled())) {
            markSkipped(n.getIdx(), "알림 시스템이 비활성 상태입니다.");
            return;
        }

        // 게이트 0-B: 일시정지 — 행을 PENDING/RETRY_WAIT 그대로 두고 다음 스케줄러 사이클 대기
        if (settings.getDispatcherPausedUntil() != null
                && settings.getDispatcherPausedUntil().isAfter(LocalDateTime.now())) {
            log.debug("[Dispatch] 일시정지 중 — idx={}, until={}",
                    n.getIdx(), settings.getDispatcherPausedUntil());
            return;
        }

        // 게이트 0-C: 외부인 (행 자체가 만들어졌다면 노이즈 — SKIP 처리)
        if (Boolean.TRUE.equals(n.getIsExternalRecipient())) {
            markSkipped(n.getIdx(), "외부인 수신자 (Mattermost 발송 대상 아님).");
            return;
        }

        // 채널 분기: INWEB 은 외부 호출 없이 즉시 SENT (행 자체가 인박스 데이터)
        if (CHANNEL_INWEB.equals(n.getChannel())) {
            markSent(n.getIdx(), null);
            return;
        }
        if (CHANNEL_MM_CH.equals(n.getChannel())) {
            // 채널 발송은 2차 지원 예정 — 1차 MVP 에선 SKIP
            markSkipped(n.getIdx(), "채널 발송은 아직 지원되지 않습니다.");
            return;
        }
        if (!CHANNEL_MM.equals(n.getChannel())) {
            markSkipped(n.getIdx(), "알 수 없는 채널: " + n.getChannel());
            return;
        }

        // 이하 C2101 MM DM 처리

        // 게이트 0-D: 구독 OFF / 방해금지 (force_send 가 우선)
        SubscriptionDecision decision = checkSubscription(n);
        if (decision == SubscriptionDecision.OFF) {
            markSkipped(n.getIdx(), "수신자가 이 종류의 알림을 끔.");
            return;
        }
        if (decision == SubscriptionDecision.QUIET) {
            // 방해금지 시간대 — 다음 시도 시각만 미루고 RETRY_WAIT 로 대기
            scheduleQuietHoursDelay(n);
            return;
        }

        // 봇 접속 정보 확인
        if (settings.getServerUrl() == null || settings.getServerUrl().isBlank()
                || settings.getBotUserId() == null || settings.getBotUserId().isBlank()
                || !tokenCipher.isPresent(settings.getBotTokenEnc())) {
            log.warn("[Dispatch] 봇 접속 정보 미완 — RETRY_WAIT 로 대기 (관리자가 채워야 발송 재개) idx={}", n.getIdx());
            scheduleRetry(n, "BOT_NOT_CONFIGURED", "봇 접속 정보가 등록되어 있지 않습니다.");
            return;
        }

        String plainToken;
        try {
            plainToken = tokenCipher.decrypt(settings.getBotTokenEnc());
        } catch (Exception e) {
            log.error("[Dispatch] 토큰 복호화 실패 — idx={}", n.getIdx(), e);
            markFailedAndCascade(n, "TOKEN_DECRYPT", "저장된 봇 토큰을 복호화하지 못함");
            return;
        }

        // 사용자 매핑 해결 (캐시 또는 MM 조회)
        Optional<ResolvedLink> linkOpt;
        try {
            linkOpt = userLinkResolver.resolve(n.getRecipientUserIdx(),
                    settings.getServerUrl(), settings.getBotUserId(), plainToken);
        } catch (MattermostApiException e) {
            // 일시 실패 — retry 큐
            scheduleRetry(n, e.getKind().name(),
                    "사용자 매핑 조회 일시 실패: " + e.getKind().name());
            return;
        }
        if (linkOpt.isEmpty()) {
            markFailedAndCascade(n, "USER_LINK_INACTIVE",
                    "수신자의 Mattermost 매핑이 비활성 상태입니다 (미가입/봇 차단/이전 영구 실패).");
            return;
        }
        ResolvedLink link = linkOpt.get();

        // 메시지 발송
        try {
            MmPost post = mmClient.postMessage(settings.getServerUrl(), plainToken,
                    link.mmDmChannelId(), n.getBody());
            markSent(n.getIdx(), post != null ? post.id() : null);
            log.info("[Dispatch] SENT — idx={}, type={}, recipient={}, postId={}",
                    n.getIdx(), n.getNotificationType(), n.getRecipientUserIdx(),
                    post != null ? post.id() : null);
        } catch (MattermostApiException e) {
            if (isPermanent(e.getKind())) {
                markFailedAndCascade(n, e.getKind().name(),
                        "Mattermost 가 발송을 거부했습니다 (" + e.getKind().name() + ").");
            } else {
                scheduleRetry(n, e.getKind().name(),
                        "발송 일시 실패: " + e.getKind().name());
            }
        } catch (Exception e) {
            log.error("[Dispatch] 알 수 없는 예외 — idx={}", n.getIdx(), e);
            scheduleRetry(n, "UNKNOWN", "알 수 없는 오류로 발송 실패");
        }
    }

    // =========================================================================
    // 상태 갱신 — 각자 작은 트랜잭션
    // =========================================================================

    @Transactional
    public void markSent(Long idx, String mmPostId) {
        Notification n = notificationRepository.findById(idx).orElse(null);
        if (n == null) return;
        n.setStatus(STATUS_SENT);
        n.setMmPostId(mmPostId);
        n.setSentAt(LocalDateTime.now());
        n.setLastError(null);
        n.setLastErrorCode(null);
        n.setNextAttemptAt(null);
        n.setUpdatedAt(LocalDateTime.now());
        n.setUpdatedUserIdx(SYSTEM_USER_IDX);
        notificationRepository.save(n);
    }

    @Transactional
    public void markSkipped(Long idx, String reason) {
        Notification n = notificationRepository.findById(idx).orElse(null);
        if (n == null) return;
        n.setStatus(STATUS_SKIPPED);
        n.setLastError(reason);
        n.setNextAttemptAt(null);
        n.setUpdatedAt(LocalDateTime.now());
        n.setUpdatedUserIdx(SYSTEM_USER_IDX);
        notificationRepository.save(n);
        log.info("[Dispatch] SKIPPED — idx={}, reason={}", idx, reason);
    }

    @Transactional
    public void markExpired(Long idx) {
        Notification n = notificationRepository.findById(idx).orElse(null);
        if (n == null) return;
        n.setStatus(STATUS_EXPIRED);
        n.setLastError("유효기간 초과로 만료 처리됨.");
        n.setLastErrorCode("EXPIRED");
        n.setNextAttemptAt(null);
        n.setUpdatedAt(LocalDateTime.now());
        n.setUpdatedUserIdx(SYSTEM_USER_IDX);
        notificationRepository.save(n);
        log.info("[Dispatch] EXPIRED — idx={}", idx);
    }

    /** 만료 + C1914 fallback (actor 에게 안내). status=EXPIRED 유지 (FAILED 로 덮어쓰지 않음). */
    public void markExpiredAndCascade(Notification failed, String reason) {
        markExpired(failed.getIdx());
        emitC1914FallbackIfNeeded(failed, reason);
    }

    /** 실패 한도 체크 후 RETRY_WAIT 또는 FAILED+C1914. */
    private void scheduleRetry(Notification n, String errorCode, String errorMsg) {
        int newCount = (n.getRetryCount() == null ? 0 : n.getRetryCount()) + 1;
        NotificationSettings settings = settingsRepository.findById(NotificationSettings.SINGLETON_IDX)
                .orElse(null);
        int maxRetry = settings != null && settings.getMaxRetryCount() != null
                ? settings.getMaxRetryCount() : 5;

        if (newCount > maxRetry) {
            markFailedAndCascade(n, errorCode, errorMsg + " (재시도 " + maxRetry + "회 초과).");
            return;
        }

        long backoffSec = backoffSeconds(newCount);
        markRetryWait(n.getIdx(), errorCode, errorMsg, newCount,
                LocalDateTime.now().plusSeconds(backoffSec));
        log.info("[Dispatch] RETRY_WAIT — idx={}, count={}, nextAttemptIn={}s, code={}",
                n.getIdx(), newCount, backoffSec, errorCode);
    }

    @Transactional
    public void markRetryWait(Long idx, String errorCode, String errorMsg,
                              int newRetryCount, LocalDateTime nextAttemptAt) {
        Notification n = notificationRepository.findById(idx).orElse(null);
        if (n == null) return;
        n.setStatus(STATUS_RETRY_WAIT);
        n.setRetryCount(newRetryCount);
        n.setLastError(errorMsg);
        n.setLastErrorCode(errorCode);
        n.setNextAttemptAt(nextAttemptAt);
        n.setUpdatedAt(LocalDateTime.now());
        n.setUpdatedUserIdx(SYSTEM_USER_IDX);
        notificationRepository.save(n);
    }

    /** 영구 실패 처리 + C1914 fallback (가능한 경우). */
    public void markFailedAndCascade(Notification failed, String errorCode, String errorMsg) {
        markFailed(failed.getIdx(), errorCode, errorMsg);
        emitC1914FallbackIfNeeded(failed, errorMsg);
    }

    @Transactional
    public void markFailed(Long idx, String errorCode, String errorMsg) {
        Notification n = notificationRepository.findById(idx).orElse(null);
        if (n == null) return;
        n.setStatus(STATUS_FAILED);
        n.setLastError(errorMsg);
        n.setLastErrorCode(errorCode);
        n.setNextAttemptAt(null);
        n.setUpdatedAt(LocalDateTime.now());
        n.setUpdatedUserIdx(SYSTEM_USER_IDX);
        notificationRepository.save(n);
        log.warn("[Dispatch] FAILED — idx={}, code={}, msg={}", idx, errorCode, errorMsg);
    }

    // =========================================================================
    // C1914 fallback
    // =========================================================================

    private void emitC1914FallbackIfNeeded(Notification failed, String reason) {
        // cascade 차단: C1914 자체의 실패는 fallback 안 함
        if (TYPE_C1914.equals(failed.getNotificationType())) return;
        // actor 없음 → 받을 사람 없음
        if (failed.getActorUserIdx() == null) return;
        // INWEB 행 영구 실패는 거의 없는 경우라 fallback 도 SKIP (행 자체가 인박스 데이터)
        if (CHANNEL_INWEB.equals(failed.getChannel())) return;

        Long rootIdx = failed.getOriginalNotificationIdx() == null
                ? failed.getIdx()
                : failed.getOriginalNotificationIdx();

        // root 당 1건 한도
        if (notificationRepository.existsC1914FallbackForRoot(rootIdx)) {
            log.debug("[C1914] root 에 이미 fallback 존재 — SKIP rootIdx={}", rootIdx);
            return;
        }

        // 변수맵 구성
        Map<String, Object> vars = new HashMap<>();
        User actor = userRepository.findById(failed.getActorUserIdx()).orElse(null);
        vars.put("recipientName", actor != null && actor.getEmpName() != null ? actor.getEmpName() : "");
        vars.put("originalNotificationTitle", nullSafeStr(failed.getTitle()));
        vars.put("failureReason", nullSafeStr(reason));
        vars.put("eventTime", LocalDateTime.now().format(HUMAN_TIME));
        vars.put("retryLink", "/notifications/" + rootIdx + "/retry");
        vars.put("originalDeepLink", nullSafeStr(failed.getLinkUrl()));
        vars.put("originalNotificationIdx", rootIdx);

        try {
            enqueueService.enqueue(NotificationCreateCommand.builder()
                    .notificationType(TYPE_C1914)
                    .channel(CHANNEL_MM)
                    .channel(CHANNEL_INWEB)
                    .recipientUserIdx(failed.getActorUserIdx())
                    .actorUserIdx(SYSTEM_USER_IDX)
                    .targetType(failed.getTargetType())
                    .targetIdx(failed.getTargetIdx())
                    .documentIdx(failed.getDocumentIdx())
                    .variables(vars)
                    .originalNotificationIdx(rootIdx)
                    .dedupKey("C1914:" + rootIdx)
                    .build());
            log.info("[C1914] fallback 발행 — rootIdx={}, actor={}", rootIdx, failed.getActorUserIdx());
        } catch (Exception e) {
            log.error("[C1914] fallback enqueue 실패 — rootIdx={}, error={}",
                    rootIdx, e.getMessage(), e);
        }
    }

    // =========================================================================
    // 구독 / 방해금지 검사
    // =========================================================================

    private SubscriptionDecision checkSubscription(Notification n) {
        if (n.getRecipientUserIdx() == null) return SubscriptionDecision.OFF;

        Optional<NotificationSubscription> subOpt =
                subscriptionRepository.findByUserIdxAndNotificationTypeAndChannel(
                        n.getRecipientUserIdx(), n.getNotificationType(), n.getChannel());

        if (subOpt.isEmpty()) {
            // 구독 행 없음 — 기본 ON 으로 본다 (시드가 모두 채워줌)
            return SubscriptionDecision.SEND;
        }

        NotificationSubscription sub = subOpt.get();
        // 강제 발송이면 모든 검사 무시
        if (Boolean.TRUE.equals(sub.getIsForceSend())) {
            return SubscriptionDecision.SEND;
        }
        if (!Boolean.TRUE.equals(sub.getIsEnabled())) {
            return SubscriptionDecision.OFF;
        }
        if (sub.getQuietHoursStart() != null && sub.getQuietHoursEnd() != null
                && isWithinQuietHours(sub.getQuietHoursStart(), sub.getQuietHoursEnd())) {
            return SubscriptionDecision.QUIET;
        }
        return SubscriptionDecision.SEND;
    }

    /** 방해금지 시간대 판정 — 22:00~08:00 처럼 자정 넘는 경우 처리 */
    private static boolean isWithinQuietHours(LocalTime start, LocalTime end) {
        LocalTime now = LocalTime.now();
        if (start.equals(end)) return false;
        if (start.isBefore(end)) {
            return !now.isBefore(start) && now.isBefore(end);
        }
        // 자정 넘는 케이스 (예: 22:00~08:00)
        return !now.isBefore(start) || now.isBefore(end);
    }

    /** 방해금지 종료 시각으로 next_attempt_at 만 미루고 RETRY_WAIT 로 대기 */
    private void scheduleQuietHoursDelay(Notification n) {
        Optional<NotificationSubscription> subOpt =
                subscriptionRepository.findByUserIdxAndNotificationTypeAndChannel(
                        n.getRecipientUserIdx(), n.getNotificationType(), n.getChannel());
        LocalTime endTime = subOpt.map(NotificationSubscription::getQuietHoursEnd).orElse(LocalTime.of(8, 0));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime next = now.toLocalDate().atTime(endTime);
        if (!next.isAfter(now)) {
            next = next.plusDays(1);
        }
        markRetryWait(n.getIdx(), "QUIET_HOURS",
                "방해금지 시간대 — " + endTime + " 이후로 발송 예정", 0, next);
    }

    // =========================================================================
    // 헬퍼
    // =========================================================================

    private static boolean isProcessable(String status) {
        return STATUS_PENDING.equals(status) || STATUS_RETRY_WAIT.equals(status);
    }

    /** 영구 실패로 분류할 MM 에러 — 재시도 의미 없음 */
    private static boolean isPermanent(MattermostErrorKind kind) {
        return switch (kind) {
            case UNAUTHORIZED, FORBIDDEN, NOT_FOUND -> true;
            default                                  -> false;
        };
    }

    /**
     * 재시도 백오프 (초). 설계 §7-5 표 그대로.
     * 1회=60s, 2회=5m, 3회=30m, 4회=2h, 5회=6h.
     */
    static long backoffSeconds(int attempt) {
        return switch (attempt) {
            case 1 -> 60L;
            case 2 -> 300L;
            case 3 -> 1800L;
            case 4 -> 7200L;
            default -> 21600L;
        };
    }

    private static String nullSafeStr(String s) {
        return s == null ? "" : s;
    }

    private enum SubscriptionDecision {
        SEND, OFF, QUIET
    }
}
