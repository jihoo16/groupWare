package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.dto.InboxEntryDto;
import com.pinecni.erp.api.notification.dto.InboxPageResponse;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.Notification;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사용자 인박스 REST API — 본인 INWEB(C2103) 알림만 조회/조작.
 */
@Slf4j
@RestController
@RequestMapping("/api/me/inbox")
@RequiredArgsConstructor
public class UserInboxController {

    private static final String CHANNEL_INWEB = "C2103";
    private static final int    DEFAULT_PAGE_SIZE = 20;
    private static final int    MAX_PAGE_SIZE     = 100;

    private final NotificationRepository notificationRepository;
    private final CodeRepository codeRepository;

    @GetMapping
    public ResponseEntity<InboxPageResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false) String type,
            HttpSession session) {

        Long userIdx = requireUser(session);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        Page<Notification> result = notificationRepository.findInboxPage(
                userIdx, unreadOnly, emptyToNull(type), PageRequest.of(safePage, safeSize));

        long totalUnread = notificationRepository.countUnreadInbox(userIdx);

        Map<String, String> typeNameCache = new HashMap<>();
        List<InboxEntryDto> content = result.getContent().stream()
                .map(n -> toDto(n, typeNameCache))
                .toList();

        return ResponseEntity.ok(InboxPageResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .totalUnread(totalUnread)
                .first(result.isFirst())
                .last(result.isLast())
                .build());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(HttpSession session) {
        Long userIdx = requireUser(session);
        return ResponseEntity.ok(Map.of("count", notificationRepository.countUnreadInbox(userIdx)));
    }

    @PutMapping("/{idx}/read")
    @Transactional
    public ResponseEntity<Void> markRead(@PathVariable Long idx, HttpSession session) {
        Long userIdx = requireUser(session);

        Notification n = notificationRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));

        if (!CHANNEL_INWEB.equals(n.getChannel())
                || n.getRecipientUserIdx() == null
                || !n.getRecipientUserIdx().equals(userIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 인박스 알림만 처리할 수 있습니다.");
        }

        if (n.getReadAt() == null) {
            LocalDateTime now = LocalDateTime.now();
            n.setReadAt(now);
            n.setUpdatedAt(now);
            n.setUpdatedUserIdx(userIdx);
            notificationRepository.save(n);
        }
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, Integer>> markAllRead(HttpSession session) {
        Long userIdx = requireUser(session);
        int updated = notificationRepository.markAllInboxRead(userIdx, LocalDateTime.now());
        log.info("[Inbox] 모두 읽음 — userIdx={}, updated={}", userIdx, updated);
        return ResponseEntity.ok(Map.of("updated", updated));
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

    private static String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private InboxEntryDto toDto(Notification n, Map<String, String> typeNameCache) {
        String typeName = typeNameCache.computeIfAbsent(n.getNotificationType(), code ->
                codeRepository.findByCode(code).map(Code::getCodeName).orElse(code));
        return InboxEntryDto.builder()
                .idx(n.getIdx())
                .notificationType(n.getNotificationType())
                .notificationTypeName(typeName)
                .title(n.getTitle())
                .body(n.getBody())
                .linkUrl(n.getLinkUrl())
                .createdAt(n.getCreatedAt())
                .readAt(n.getReadAt())
                .build();
    }
}
