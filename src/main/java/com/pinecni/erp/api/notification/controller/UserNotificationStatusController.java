package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.notification.dto.TestSendResponse;
import com.pinecni.erp.api.notification.repository.NotificationUserLinkRepository;
import com.pinecni.erp.api.notification.service.BotConnectionTestService;
import com.pinecni.erp.entity.NotificationUserLink;
import jakarta.servlet.http.HttpSession;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

/**
 * 사용자 본인 — Mattermost 연결 상태 조회 / 테스트 발송 / 연결 새로고침.
 */
@Slf4j
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class UserNotificationStatusController {

    private final BotConnectionTestService botConnectionTestService;
    private final NotificationUserLinkRepository linkRepository;

    /** 본인 user_link 캐시 정보 */
    @GetMapping("/mattermost-link")
    public ResponseEntity<MyLinkInfoDto> myLink(HttpSession session) {
        Long userIdx = requireUser(session);
        NotificationUserLink link = linkRepository.findByUserIdx(userIdx).orElse(null);
        if (link == null) {
            return ResponseEntity.ok(MyLinkInfoDto.builder()
                    .connected(false)
                    .isActive(false)
                    .build());
        }
        return ResponseEntity.ok(MyLinkInfoDto.builder()
                .connected(Boolean.TRUE.equals(link.getIsActive())
                        && link.getMmUserId() != null && link.getMmDmChannelId() != null)
                .mmUserId(link.getMmUserId())
                .mmDmChannelId(link.getMmDmChannelId())
                .isActive(Boolean.TRUE.equals(link.getIsActive()))
                .lastError(link.getLastError())
                .cachedAt(link.getCachedAt())
                .build());
    }

    /** 본인 → 본인 테스트 메시지 1통. 같은 로직 재사용. */
    @PostMapping("/notifications/test-send")
    public ResponseEntity<TestSendResponse> testSend(HttpSession session) {
        Long userIdx = requireUser(session);
        log.info("[Me] 테스트 발송 — userIdx={}", userIdx);
        return ResponseEntity.ok(botConnectionTestService.sendTestMessage(userIdx));
    }

    /**
     * 본인 user_link 캐시 무효화 — 다음 발송 시 MM 에 다시 사용자/채널 조회.
     * MM 가입을 새로 했거나 봇 차단을 풀었을 때 사용.
     */
    @PostMapping("/notifications/refresh-link")
    @Transactional
    public ResponseEntity<MyLinkInfoDto> refreshLink(HttpSession session) {
        Long userIdx = requireUser(session);
        linkRepository.findByUserIdx(userIdx).ifPresent(linkRepository::delete);
        log.info("[Me] user_link 캐시 무효화 — userIdx={}", userIdx);
        return ResponseEntity.ok(MyLinkInfoDto.builder()
                .connected(false)
                .isActive(false)
                .build());
    }

    private static Long requireUser(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userIdx;
    }

    @Getter
    @Builder
    public static class MyLinkInfoDto {
        private final boolean       connected;
        private final boolean       isActive;
        private final String        mmUserId;
        private final String        mmDmChannelId;
        private final String        lastError;
        private final LocalDateTime cachedAt;
    }
}
