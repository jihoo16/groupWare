package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.notification.dto.MySubscriptionsResponse;
import com.pinecni.erp.api.notification.dto.MySubscriptionsUpdateRequest;
import com.pinecni.erp.api.notification.dto.QuietHoursDto;
import com.pinecni.erp.api.notification.dto.SubscriptionDto;
import com.pinecni.erp.api.notification.repository.NotificationSubscriptionRepository;
import com.pinecni.erp.entity.NotificationSubscription;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 사용자 알림 구독 설정 — /settings 의 [알림] 탭이 사용.
 */
@Slf4j
@RestController
@RequestMapping("/api/me/subscriptions")
@RequiredArgsConstructor
public class UserSubscriptionController {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationSubscriptionRepository subscriptionRepository;

    @GetMapping
    public ResponseEntity<MySubscriptionsResponse> get(HttpSession session) {
        Long userIdx = requireUser(session);
        List<NotificationSubscription> rows = subscriptionRepository.findByUserIdx(userIdx);

        List<SubscriptionDto> subs = rows.stream()
                .map(s -> SubscriptionDto.builder()
                        .notificationType(s.getNotificationType())
                        .channel(s.getChannel())
                        .isEnabled(Boolean.TRUE.equals(s.getIsEnabled()))
                        .isForceSend(Boolean.TRUE.equals(s.getIsForceSend()))
                        .build())
                .toList();

        // 방해금지는 모든 행이 같은 값이라고 가정 — 첫 행에서 채취
        QuietHoursDto qh = rows.stream()
                .filter(s -> s.getQuietHoursStart() != null && s.getQuietHoursEnd() != null)
                .findFirst()
                .map(s -> QuietHoursDto.builder()
                        .enabled(true)
                        .start(s.getQuietHoursStart().format(HHMM))
                        .end(s.getQuietHoursEnd().format(HHMM))
                        .build())
                .orElse(QuietHoursDto.builder().enabled(false).start("22:00").end("08:00").build());

        return ResponseEntity.ok(MySubscriptionsResponse.builder()
                .subscriptions(subs)
                .quietHours(qh)
                .build());
    }

    @PutMapping
    @Transactional
    public ResponseEntity<MySubscriptionsResponse> update(@RequestBody MySubscriptionsUpdateRequest req,
                                                          HttpSession session) {
        Long userIdx = requireUser(session);
        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        // 1) 토글 반영 — force_send 행은 사용자가 변경 못 함
        if (req.getSubscriptions() != null) {
            for (SubscriptionDto s : req.getSubscriptions()) {
                if (s.getNotificationType() == null || s.getChannel() == null) continue;
                NotificationSubscription row = subscriptionRepository
                        .findByUserIdxAndNotificationTypeAndChannel(userIdx, s.getNotificationType(), s.getChannel())
                        .orElse(null);
                if (row == null) continue;
                if (Boolean.TRUE.equals(row.getIsForceSend())) continue;
                row.setIsEnabled(Boolean.TRUE.equals(s.getIsEnabled()));
                row.setUpdatedAt(LocalDateTime.now());
                row.setUpdatedUserIdx(userIdx);
                subscriptionRepository.save(row);
            }
        }

        // 2) 방해금지 — 모든 행에 동일 값 적용 (또는 비활성 시 NULL)
        QuietHoursDto qh = req.getQuietHours();
        LocalTime start = null, end = null;
        if (qh != null && Boolean.TRUE.equals(qh.getEnabled())) {
            start = parseHmm(qh.getStart());
            end   = parseHmm(qh.getEnd());
        }
        for (NotificationSubscription row : subscriptionRepository.findByUserIdx(userIdx)) {
            row.setQuietHoursStart(start);
            row.setQuietHoursEnd(end);
            row.setUpdatedAt(LocalDateTime.now());
            row.setUpdatedUserIdx(userIdx);
            subscriptionRepository.save(row);
        }

        log.info("[Subscriptions] 갱신 — userIdx={}, quietHours={}~{}", userIdx, start, end);
        return get(session);
    }

    // =========================================================================
    // 헬퍼
    // =========================================================================

    private static Long requireUser(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userIdx;
    }

    private static LocalTime parseHmm(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return LocalTime.parse(s, HHMM);
        } catch (Exception e) {
            return null;
        }
    }
}
