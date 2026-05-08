package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.dto.InboxEntryDto;
import com.pinecni.erp.api.notification.dto.InboxPageResponse;
import com.pinecni.erp.api.notification.dto.SentEntryDto;
import com.pinecni.erp.api.notification.dto.SentPageResponse;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.api.signature.repository.DocumentSignatureRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.DocumentSignature;
import com.pinecni.erp.entity.Notification;
import com.pinecni.erp.entity.User;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 사용자 인박스 REST API — 본인 INWEB(C2103) 알림 + 본인이 발송한 알림.
 */
@Slf4j
@RestController
@RequestMapping("/api/me/inbox")
@RequiredArgsConstructor
public class UserInboxController {

    private static final String CHANNEL_INWEB         = "C2103";
    private static final String NOTIF_SIGNATURE_REQ   = "C1901";
    private static final int    DEFAULT_PAGE_SIZE     = 20;
    private static final int    MAX_PAGE_SIZE         = 100;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final DocumentSignatureRepository documentSignatureRepository;

    @GetMapping
    @Transactional
    public ResponseEntity<InboxPageResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false) String type,
            HttpSession session) {

        Long userIdx = requireUser(session);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        // 첫 페이지 진입 시 — 본인의 모든 안 읽은 서명요청 알림 중 이미 서명을 끝낸 것을
        // 한 번에 자동 읽음 처리. 사이드바 빨간 점/카운트가 정확히 동기화되도록.
        LocalDateTime now = LocalDateTime.now();
        if (safePage == 0) {
            syncSignedSignatureRequestsAsRead(userIdx, now);
        }

        Page<Notification> result = notificationRepository.findInboxPage(
                userIdx, unreadOnly, emptyToNull(type), PageRequest.of(safePage, safeSize));

        // 서명요청(C1901) 알림은 targetIdx 가 DocumentSignature.idx — 일괄 조회로 처리 상태 확인
        Set<Long> sigTargetIdxs = result.getContent().stream()
                .filter(n -> NOTIF_SIGNATURE_REQ.equals(n.getNotificationType()))
                .map(Notification::getTargetIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, DocumentSignature> sigMap = new HashMap<>();
        if (!sigTargetIdxs.isEmpty()) {
            documentSignatureRepository.findAllById(sigTargetIdxs)
                    .forEach(ds -> sigMap.put(ds.getIdx(), ds));
        }

        // 이미 서명을 끝낸 사용자에게는 해당 서명요청 알림을 자동으로 읽음 처리
        for (Notification n : result.getContent()) {
            if (!NOTIF_SIGNATURE_REQ.equals(n.getNotificationType())) continue;
            if (n.getReadAt() != null) continue;
            DocumentSignature ds = sigMap.get(n.getTargetIdx());
            if (ds != null && ds.getSignedAt() != null) {
                n.setReadAt(now);
                n.setUpdatedAt(now);
                n.setUpdatedUserIdx(userIdx);
                notificationRepository.save(n);
            }
        }

        long totalUnread = notificationRepository.countUnreadInbox(userIdx);

        Map<String, String> typeNameCache = new HashMap<>();
        List<InboxEntryDto> content = result.getContent().stream()
                .map(n -> toDto(n, typeNameCache, sigMap))
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
    // 보낸 알림 (actor = me)
    // =========================================================================

    @GetMapping("/sent")
    public ResponseEntity<SentPageResponse> listSent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            HttpSession session) {

        Long userIdx = requireUser(session);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        Page<Notification> result = notificationRepository.findSentPage(
                userIdx, emptyToNull(channel), emptyToNull(type), emptyToNull(status),
                PageRequest.of(safePage, safeSize));

        // 일괄 조회로 N+1 회피
        Set<Long> recipientIdxs = new HashSet<>();
        result.getContent().forEach(n -> {
            if (n.getRecipientUserIdx() != null) recipientIdxs.add(n.getRecipientUserIdx());
        });
        Map<Long, User> userMap = new HashMap<>();
        userRepository.findAllById(recipientIdxs).forEach(u -> userMap.put(u.getIdx(), u));

        Map<String, String> typeNameCache    = new HashMap<>();
        Map<String, String> statusNameCache  = new HashMap<>();

        List<SentEntryDto> content = result.getContent().stream()
                .map(n -> toSentDto(n, userMap, typeNameCache, statusNameCache))
                .toList();

        return ResponseEntity.ok(SentPageResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build());
    }

    private SentEntryDto toSentDto(Notification n, Map<Long, User> userMap,
                                   Map<String, String> typeNameCache, Map<String, String> statusNameCache) {
        User recipient = n.getRecipientUserIdx() != null ? userMap.get(n.getRecipientUserIdx()) : null;
        String typeName    = typeNameCache.computeIfAbsent(n.getNotificationType(), c ->
                codeRepository.findByCode(c).map(Code::getCodeName).orElse(c));
        String statusName  = n.getStatus() == null ? null
                : statusNameCache.computeIfAbsent(n.getStatus(), c ->
                        codeRepository.findByCode(c).map(Code::getCodeName).orElse(c));
        return SentEntryDto.builder()
                .idx(n.getIdx())
                .notificationType(n.getNotificationType())
                .notificationTypeName(typeName)
                .channel(n.getChannel())
                .channelLabel(channelLabel(n.getChannel()))
                .title(n.getTitle())
                .body(n.getBody())
                .linkUrl(n.getLinkUrl())
                .recipientUserIdx(n.getRecipientUserIdx())
                .recipientName(recipient != null ? recipient.getEmpName() : null)
                .recipientEmpId(recipient != null ? recipient.getEmpId() : null)
                .status(n.getStatus())
                .statusName(statusName)
                .retryCount(n.getRetryCount())
                .lastError(n.getLastError())
                .createdAt(n.getCreatedAt())
                .sentAt(n.getSentAt())
                .build();
    }

    /**
     * 본인의 안 읽은 서명요청 알림 중 이미 서명이 끝난 행을 일괄 읽음 처리.
     * 인박스 첫 페이지 진입 시 호출되어 사이드바 카운트와 실제 처리 상태를 동기화한다.
     */
    private void syncSignedSignatureRequestsAsRead(Long userIdx, LocalDateTime now) {
        List<Notification> unread = notificationRepository.findUnreadInboxByType(userIdx, NOTIF_SIGNATURE_REQ);
        if (unread.isEmpty()) return;

        Set<Long> targetIdxs = unread.stream()
                .map(Notification::getTargetIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (targetIdxs.isEmpty()) return;

        Map<Long, DocumentSignature> sigMap = new HashMap<>();
        documentSignatureRepository.findAllById(targetIdxs)
                .forEach(ds -> sigMap.put(ds.getIdx(), ds));

        int updated = 0;
        for (Notification n : unread) {
            DocumentSignature ds = sigMap.get(n.getTargetIdx());
            if (ds != null && ds.getSignedAt() != null) {
                n.setReadAt(now);
                n.setUpdatedAt(now);
                n.setUpdatedUserIdx(userIdx);
                notificationRepository.save(n);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("[Inbox] 서명완료 자동 읽음 동기화 — userIdx={}, updated={}", userIdx, updated);
        }
    }

    private static String channelLabel(String channel) {
        if (channel == null) return null;
        return switch (channel) {
            case "C2101" -> "메신저";
            case "C2102" -> "채널";
            case "C2103" -> "인박스";
            default      -> channel;
        };
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

    private InboxEntryDto toDto(Notification n, Map<String, String> typeNameCache,
                                 Map<Long, DocumentSignature> sigMap) {
        String typeName = typeNameCache.computeIfAbsent(n.getNotificationType(), code ->
                codeRepository.findByCode(code).map(Code::getCodeName).orElse(code));

        String signatureStatus = null;
        if (NOTIF_SIGNATURE_REQ.equals(n.getNotificationType()) && n.getTargetIdx() != null) {
            DocumentSignature ds = sigMap.get(n.getTargetIdx());
            if (ds != null) {
                signatureStatus = ds.getSignedAt() != null ? "COMPLETED" : "PENDING";
            }
        }

        return InboxEntryDto.builder()
                .idx(n.getIdx())
                .notificationType(n.getNotificationType())
                .notificationTypeName(typeName)
                .title(n.getTitle())
                .body(n.getBody())
                .linkUrl(n.getLinkUrl())
                .createdAt(n.getCreatedAt())
                .readAt(n.getReadAt())
                .signatureStatus(signatureStatus)
                .build();
    }
}
