package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.client.MattermostClient;
import com.pinecni.erp.api.notification.client.MattermostClient.MattermostApiException;
import com.pinecni.erp.api.notification.client.MattermostClient.MattermostErrorKind;
import com.pinecni.erp.api.notification.client.MattermostClient.MmChannel;
import com.pinecni.erp.api.notification.client.MattermostClient.MmUser;
import com.pinecni.erp.api.notification.repository.NotificationUserLinkRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.NotificationUserLink;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * 사용자 ↔ Mattermost 식별자 캐시 해결.
 *
 * <p>발송이 일어날 때마다 MM API 로 사번 조회하면 부하가 크기 때문에
 * 첫 1회만 조회하고 {@code notification_user_links} 에 저장해두고 재사용한다.
 *
 * <p>실패 시에도 행을 만들어 두고 {@code is_active=false} + {@code last_error} 에
 * 사유를 캐시 — 같은 사용자에게 다음 알림이 발생해도 무의미한 MM 호출 반복 안 함.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationUserLinkResolver {

    private final NotificationUserLinkRepository linkRepository;
    private final UserRepository userRepository;
    private final MattermostClient mmClient;

    /**
     * userIdx 의 (mmUserId, mmDmChannelId) 를 해결한다.
     *
     * @return 활성 캐시면 그 값. MM 미가입/봇차단 등 영구 실패는 빈 Optional + DB 에 비활성 캐시 저장.
     *         일시 실패 (timeout/네트워크) 는 throw — 호출측이 retry 큐에 넣을 수 있도록.
     */
    public Optional<ResolvedLink> resolve(Long userIdx, String serverUrl, String botUserId, String plainToken) {
        // 1) 캐시 hit?
        Optional<NotificationUserLink> cached = linkRepository.findByUserIdx(userIdx);
        if (cached.isPresent()) {
            NotificationUserLink link = cached.get();
            if (Boolean.TRUE.equals(link.getIsActive())
                    && link.getMmUserId() != null && link.getMmDmChannelId() != null) {
                return Optional.of(new ResolvedLink(link.getMmUserId(), link.getMmDmChannelId()));
            }
            // 비활성 (이전에 영구 실패로 마킹됨) — MM 호출 반복 안 함
            return Optional.empty();
        }

        // 2) 사용자 사번 조회
        User user = userRepository.findById(userIdx).orElse(null);
        if (user == null || user.getEmpId() == null || user.getEmpId().isBlank()) {
            saveFailureCache(userIdx, "사용자 사번이 없거나 사용자가 존재하지 않음");
            return Optional.empty();
        }

        // 3) MM 사용자 조회
        MmUser mmUser;
        try {
            mmUser = mmClient.getUserByUsername(serverUrl, plainToken, user.getEmpId());
        } catch (MattermostApiException e) {
            if (isPermanent(e.getKind())) {
                String reason = switch (e.getKind()) {
                    case NOT_FOUND  -> "MM 미가입 (사번 " + user.getEmpId() + ")";
                    case FORBIDDEN  -> "봇이 사용자 조회 권한 없음";
                    default         -> e.getKind().name();
                };
                log.warn("[UserLink] MM 사용자 조회 영구 실패 — userIdx={}, kind={}", userIdx, e.getKind());
                saveFailureCache(userIdx, reason);
                return Optional.empty();
            }
            // 일시 실패 (timeout/네트워크) — 캐시 안 저장하고 throw
            log.warn("[UserLink] MM 사용자 조회 일시 실패 — userIdx={}, kind={}", userIdx, e.getKind());
            throw e;
        }

        // 4) DM 채널 생성/조회
        MmChannel dm;
        try {
            dm = mmClient.createDirectChannel(serverUrl, plainToken, botUserId, mmUser.id());
        } catch (MattermostApiException e) {
            if (isPermanent(e.getKind())) {
                String reason = switch (e.getKind()) {
                    case FORBIDDEN  -> "봇이 DM 차단됨 또는 권한 없음";
                    default         -> e.getKind().name();
                };
                log.warn("[UserLink] DM 채널 생성 영구 실패 — userIdx={}, kind={}", userIdx, e.getKind());
                saveFailureCacheWithMmId(userIdx, mmUser.id(), reason);
                return Optional.empty();
            }
            log.warn("[UserLink] DM 채널 생성 일시 실패 — userIdx={}, kind={}", userIdx, e.getKind());
            throw e;
        }

        // 5) 캐시 저장 (성공)
        saveSuccessCache(userIdx, mmUser.id(), dm.id());
        log.info("[UserLink] 캐시 등록 — userIdx={}, mmUserId={}, dmChannelId={}",
                userIdx, mmUser.id(), dm.id());

        return Optional.of(new ResolvedLink(mmUser.id(), dm.id()));
    }

    // =========================================================================
    // 캐시 저장 헬퍼 (각자 작은 트랜잭션)
    // =========================================================================

    @Transactional
    public void saveSuccessCache(Long userIdx, String mmUserId, String dmChannelId) {
        NotificationUserLink link = linkRepository.findByUserIdx(userIdx)
                .orElseGet(() -> NotificationUserLink.builder()
                        .userIdx(userIdx)
                        .createdUserIdx(1L)
                        .build());
        link.setMmUserId(mmUserId);
        link.setMmDmChannelId(dmChannelId);
        link.setIsActive(true);
        link.setLastError(null);
        link.setCachedAt(LocalDateTime.now());
        link.setUpdatedAt(LocalDateTime.now());
        link.setUpdatedUserIdx(1L);
        linkRepository.save(link);
    }

    @Transactional
    public void saveFailureCache(Long userIdx, String reason) {
        saveFailureCacheWithMmId(userIdx, null, reason);
    }

    @Transactional
    public void saveFailureCacheWithMmId(Long userIdx, String mmUserId, String reason) {
        NotificationUserLink link = linkRepository.findByUserIdx(userIdx)
                .orElseGet(() -> NotificationUserLink.builder()
                        .userIdx(userIdx)
                        .createdUserIdx(1L)
                        .build());
        if (mmUserId != null) link.setMmUserId(mmUserId);
        link.setIsActive(false);
        link.setLastError(reason);
        link.setCachedAt(LocalDateTime.now());
        link.setUpdatedAt(LocalDateTime.now());
        link.setUpdatedUserIdx(1L);
        linkRepository.save(link);
    }

    /** 영구 실패 종류만 캐시한다. 일시 실패는 retry 큐가 다음에 시도할 수 있도록 통과. */
    private static boolean isPermanent(MattermostErrorKind kind) {
        return switch (kind) {
            case NOT_FOUND, FORBIDDEN, UNAUTHORIZED -> true;
            default                                  -> false;
        };
    }

    /** 해결된 식별자 쌍 */
    public record ResolvedLink(String mmUserId, String mmDmChannelId) { }
}
