package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.dto.AdminLogEntryDto;
import com.pinecni.erp.api.notification.dto.AdminLogPageResponse;
import com.pinecni.erp.api.notification.dto.AnnounceRequest;
import com.pinecni.erp.api.notification.dto.BotConnectionTestResponse;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.dto.NotificationSettingsResponse;
import com.pinecni.erp.api.notification.dto.NotificationSettingsUpdateRequest;
import com.pinecni.erp.api.notification.service.NotificationEnqueueService;
import com.pinecni.erp.api.notification.dto.TemplateDto;
import com.pinecni.erp.api.notification.dto.TestSendResponse;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.api.notification.repository.NotificationTemplateRepository;
import com.pinecni.erp.api.notification.service.BotConnectionTestService;
import com.pinecni.erp.api.notification.service.NotificationSettingsService;
import com.pinecni.erp.entity.NotificationTemplate;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.Notification;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 관리자 알림 시스템 설정 REST API.
 *
 * <p>권한: C1101(DEVELOPER), C1102(ADMIN) 만. C1105(EXECUTIVE) 는 알림 관리에서 제외.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final NotificationSettingsService settingsService;
    private final BotConnectionTestService botConnectionTestService;
    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final CodeRepository codeRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final NotificationEnqueueService notificationEnqueueService;

    @GetMapping("/settings")
    public ResponseEntity<NotificationSettingsResponse> getSettings(HttpSession session) {
        assertPermission(session);
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<NotificationSettingsResponse> updateSettings(
            @RequestBody NotificationSettingsUpdateRequest req,
            HttpSession session) {
        assertPermission(session);
        Long userIdx = (Long) session.getAttribute("userIdx");
        log.info("[알림 설정] 저장 요청 — userIdx={}, isEnabled={}, botTokenChanged={}",
                userIdx,
                req.getIsEnabled(),
                req.getBotToken() != null && !req.getBotToken().isBlank());
        return ResponseEntity.ok(settingsService.updateSettings(req, userIdx));
    }

    /**
     * [봇 연결 테스트] — 저장된 토큰으로 Mattermost API 호출해 인증 + 채널 접근 검증.
     *
     * <p>성공 시 봇 식별자 (bot_user_id) 자동 갱신.
     */
    @PostMapping("/test-connection")
    public ResponseEntity<BotConnectionTestResponse> testConnection(HttpSession session) {
        assertPermission(session);
        Long userIdx = (Long) session.getAttribute("userIdx");
        log.info("[알림 설정] 봇 연결 테스트 요청 — userIdx={}", userIdx);
        return ResponseEntity.ok(botConnectionTestService.testConnection(userIdx));
    }

    /**
     * [지금 나에게 테스트 발송] — 본인 사번 → MM DM → 메시지 1통.
     *
     * <p>발송 경로 (사번 lookup → DM 채널 → post) 전체를 검증한다.
     * 성공 시 본인 Mattermost 인박스에 봇 메시지가 도착.
     */
    @PostMapping("/test-send")
    public ResponseEntity<TestSendResponse> testSend(HttpSession session) {
        assertPermission(session);
        Long userIdx = (Long) session.getAttribute("userIdx");
        log.info("[알림 설정] 테스트 발송 요청 — userIdx={}", userIdx);
        return ResponseEntity.ok(botConnectionTestService.sendTestMessage(userIdx));
    }

    // =========================================================================
    // 발송 이력
    // =========================================================================

    @GetMapping("/logs")
    public ResponseEntity<AdminLogPageResponse> logs(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            HttpSession session) {

        assertPermission(session);

        LocalDateTime fromDt = parseStart(from);
        LocalDateTime toDt   = parseEndExclusive(to);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Page<Notification> result = notificationRepository.findAdminLogPage(
                emptyToNull(type), emptyToNull(status), fromDt, toDt, emptyToNull(keyword),
                PageRequest.of(safePage, safeSize));

        // 일괄 lookup 으로 N+1 회피
        List<Notification> rows = result.getContent();
        Map<Long, User> userMap = new HashMap<>();
        userRepository.findAllById(rows.stream()
                .flatMap(n -> java.util.stream.Stream.of(n.getRecipientUserIdx(), n.getActorUserIdx()))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList()).forEach(u -> userMap.put(u.getIdx(), u));
        Map<Long, ApprovalDocument> docMap = new HashMap<>();
        approvalDocumentRepository.findAllById(rows.stream()
                .map(Notification::getDocumentIdx)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList()).forEach(d -> docMap.put(d.getIdx(), d));

        Map<String, String> typeNameCache   = new HashMap<>();
        Map<String, String> statusNameCache = new HashMap<>();

        // C1914 fallback 발행 여부 (root 당 1건) — 행마다 root 결정 후 한 번씩 확인
        Map<Long, Boolean> fallbackEmittedCache = new HashMap<>();

        List<AdminLogEntryDto> content = rows.stream()
                .map(n -> toLogDto(n, userMap, docMap, typeNameCache, statusNameCache, fallbackEmittedCache))
                .collect(Collectors.toList());

        return ResponseEntity.ok(AdminLogPageResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build());
    }

    /** 단건 상세 조회 */
    @GetMapping("/logs/{idx}")
    public ResponseEntity<AdminLogEntryDto> logDetail(@PathVariable Long idx, HttpSession session) {
        assertPermission(session);
        Notification n = notificationRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));
        Map<Long, User> userMap = new HashMap<>();
        if (n.getRecipientUserIdx() != null) userRepository.findById(n.getRecipientUserIdx()).ifPresent(u -> userMap.put(u.getIdx(), u));
        if (n.getActorUserIdx()     != null) userRepository.findById(n.getActorUserIdx()).ifPresent(u -> userMap.put(u.getIdx(), u));
        Map<Long, ApprovalDocument> docMap = new HashMap<>();
        if (n.getDocumentIdx() != null) approvalDocumentRepository.findById(n.getDocumentIdx()).ifPresent(d -> docMap.put(d.getIdx(), d));
        return ResponseEntity.ok(toLogDto(n, userMap, docMap, new HashMap<>(), new HashMap<>(), new HashMap<>()));
    }

    /** 행 강제 재시도 — PENDING/RETRY_WAIT 외 모든 상태에서 클론 INSERT 후 디스패치 */
    @PostMapping("/logs/{idx}/retry")
    @Transactional
    public ResponseEntity<Map<String, Object>> retryLog(@PathVariable Long idx, HttpSession session) {
        assertPermission(session);
        Long userIdx = (Long) session.getAttribute("userIdx");

        Notification n = notificationRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));

        Long rootIdx = n.getOriginalNotificationIdx() == null ? n.getIdx() : n.getOriginalNotificationIdx();
        long manualClones = notificationRepository.countByOriginalNotificationIdxAndNotificationTypeNot(rootIdx, "C1914");

        Notification clone = Notification.builder()
                .notificationType(n.getNotificationType())
                .channel(n.getChannel())
                .recipientUserIdx(n.getRecipientUserIdx())
                .isExternalRecipient(false)
                .actorUserIdx(n.getActorUserIdx())
                .targetType(n.getTargetType())
                .targetIdx(n.getTargetIdx())
                .documentIdx(n.getDocumentIdx())
                .title(n.getTitle())
                .body(n.getBody())
                .linkUrl(n.getLinkUrl())
                .payloadJson(n.getPayloadJson())
                .status("C2001")
                .retryCount(0)
                .originalNotificationIdx(rootIdx)
                .dedupKey("ADMIN-RETRY:" + rootIdx + ":" + (manualClones + 1))
                .createdUserIdx(userIdx)
                .build();
        Notification saved = notificationRepository.save(clone);
        eventPublisher.publishEvent(new com.pinecni.erp.api.notification.event.NotificationEnqueueRequestedEvent(saved.getIdx()));
        log.info("[Logs] 관리자 재시도 — rootIdx={}, newIdx={}, userIdx={}", rootIdx, saved.getIdx(), userIdx);
        return ResponseEntity.ok(Map.of("newIdx", saved.getIdx()));
    }

    /** PENDING/RETRY_WAIT 행 취소 — status=SKIPPED 로 마킹 */
    @PostMapping("/logs/{idx}/cancel")
    @Transactional
    public ResponseEntity<Map<String, String>> cancelLog(@PathVariable Long idx, HttpSession session) {
        assertPermission(session);
        Long userIdx = (Long) session.getAttribute("userIdx");

        Notification n = notificationRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));

        if (!"C2001".equals(n.getStatus()) && !"C2005".equals(n.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "대기중 또는 재시도대기 상태인 알림만 취소할 수 있습니다.");
        }

        n.setStatus("C2003");  // SKIPPED
        n.setLastError("관리자가 발송을 취소했습니다.");
        n.setLastErrorCode("ADMIN_CANCEL");
        n.setNextAttemptAt(null);
        n.setUpdatedAt(LocalDateTime.now());
        n.setUpdatedUserIdx(userIdx);
        notificationRepository.save(n);
        log.info("[Logs] 관리자 취소 — idx={}, userIdx={}", idx, userIdx);
        return ResponseEntity.ok(Map.of("status", "C2003"));
    }

    /** CSV 내보내기 — UTF-8 BOM + 현재 필터 조건. 최대 10,000행. */
    @GetMapping(value = "/logs/export", produces = "text/csv; charset=UTF-8")
    public void exportLogsCsv(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            HttpSession session,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {

        assertPermission(session);

        LocalDateTime fromDt = parseStart(from);
        LocalDateTime toDt   = parseEndExclusive(to);

        Page<Notification> p = notificationRepository.findAdminLogPage(
                emptyToNull(type), emptyToNull(status), fromDt, toDt, emptyToNull(keyword),
                PageRequest.of(0, 10_000));

        List<Notification> rows = p.getContent();
        Map<Long, User> userMap = new HashMap<>();
        userRepository.findAllById(rows.stream()
                .flatMap(n -> java.util.stream.Stream.of(n.getRecipientUserIdx(), n.getActorUserIdx()))
                .filter(java.util.Objects::nonNull).distinct().toList())
                .forEach(u -> userMap.put(u.getIdx(), u));
        Map<Long, ApprovalDocument> docMap = new HashMap<>();
        approvalDocumentRepository.findAllById(rows.stream()
                .map(Notification::getDocumentIdx)
                .filter(java.util.Objects::nonNull).distinct().toList())
                .forEach(d -> docMap.put(d.getIdx(), d));

        Map<String, String> typeNameCache   = new HashMap<>();
        Map<String, String> statusNameCache = new HashMap<>();

        String filename = "notifications_" +
                LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".csv";
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename*=UTF-8''" + java.net.URLEncoder.encode(filename, java.nio.charset.StandardCharsets.UTF_8));

        try (java.io.PrintWriter out = response.getWriter()) {
            out.write('﻿');  // UTF-8 BOM (엑셀 호환)
            out.println("idx,종류,수신자,수신자사번,처리자,상태,재시도,에러,문서번호,생성시각,발송시각");
            java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (Notification n : rows) {
                User recipient = n.getRecipientUserIdx() != null ? userMap.get(n.getRecipientUserIdx()) : null;
                User actor     = n.getActorUserIdx()     != null ? userMap.get(n.getActorUserIdx())     : null;
                ApprovalDocument doc = n.getDocumentIdx() != null ? docMap.get(n.getDocumentIdx()) : null;
                out.println(String.join(",",
                        csv(String.valueOf(n.getIdx())),
                        csv(resolveCodeName(n.getNotificationType(), typeNameCache)),
                        csv(recipient != null ? recipient.getEmpName() : ""),
                        csv(recipient != null ? recipient.getEmpId() : ""),
                        csv(actor != null ? actor.getEmpName() : ""),
                        csv(resolveCodeName(n.getStatus(), statusNameCache)),
                        csv(n.getRetryCount() != null ? n.getRetryCount().toString() : "0"),
                        csv(n.getLastError() != null ? n.getLastError() : ""),
                        csv(doc != null ? doc.getDocumentNo() : ""),
                        csv(n.getCreatedAt() != null ? n.getCreatedAt().format(fmt) : ""),
                        csv(n.getSentAt()    != null ? n.getSentAt().format(fmt)    : "")
                ));
            }
        }
    }

    private static String csv(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    // =========================================================================
    // 템플릿 편집
    // =========================================================================

    @GetMapping("/templates")
    public ResponseEntity<List<TemplateDto>> listTemplates(HttpSession session) {
        assertPermission(session);
        Map<String, String> typeNameCache = new HashMap<>();
        List<TemplateDto> all = templateRepository.findAll().stream()
                .sorted((a, b) -> a.getNotificationType().compareTo(b.getNotificationType()))
                .map(t -> toTemplateDto(t, typeNameCache))
                .toList();
        return ResponseEntity.ok(all);
    }

    @PutMapping("/templates/{type}")
    @Transactional
    public ResponseEntity<TemplateDto> updateTemplate(
            @PathVariable String type,
            @RequestBody TemplateDto req,
            HttpSession session) {
        assertPermission(session);
        Long userIdx = (Long) session.getAttribute("userIdx");

        NotificationTemplate tpl = templateRepository.findByNotificationType(type)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "알림 템플릿을 찾을 수 없습니다: " + type));

        if (req.getTitle() != null) tpl.setTitleTemplate(req.getTitle());
        if (req.getBody()  != null) tpl.setBodyTemplate(req.getBody());
        if (req.getLink()  != null) tpl.setLinkTemplate(req.getLink().isBlank() ? null : req.getLink());
        if (req.getColor() != null) tpl.setColor(req.getColor().isBlank() ? null : req.getColor());
        if (req.getIsEnabled() != null) tpl.setIsEnabled(req.getIsEnabled());
        tpl.setUpdatedAt(LocalDateTime.now());
        tpl.setUpdatedUserIdx(userIdx);

        NotificationTemplate saved = templateRepository.save(tpl);
        log.info("[Templates] 갱신 — type={}, userIdx={}", type, userIdx);
        return ResponseEntity.ok(toTemplateDto(saved, new HashMap<>()));
    }

    private TemplateDto toTemplateDto(NotificationTemplate t, Map<String, String> typeNameCache) {
        String name = resolveCodeName(t.getNotificationType(), typeNameCache);
        return TemplateDto.builder()
                .notificationType(t.getNotificationType())
                .notificationTypeName(name)
                .title(t.getTitleTemplate())
                .body(t.getBodyTemplate())
                .link(t.getLinkTemplate())
                .color(t.getColor())
                .isEnabled(Boolean.TRUE.equals(t.getIsEnabled()))
                .build();
    }

    // =========================================================================
    // 시스템 공지 (C1915)
    // =========================================================================

    /**
     * 관리자 수동 공지 발송. 기본은 채널(C2102) 한 건. {@code alsoInbox=true} 면 활성 사용자
     * 모두에게 INWEB 행도 INSERT.
     */
    @PostMapping("/announce")
    @Transactional
    public ResponseEntity<Map<String, Object>> announce(@RequestBody AnnounceRequest req,
                                                        HttpSession session) {
        assertPermission(session);
        Long actorIdx = (Long) session.getAttribute("userIdx");

        if (req == null || req.getTitle() == null || req.getTitle().isBlank()
                || req.getBody() == null || req.getBody().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "공지 제목과 본문을 입력해 주세요.");
        }

        String actorName = actorIdx != null
                ? userRepository.findById(actorIdx).map(User::getEmpName).orElse("관리자")
                : "관리자";

        Map<String, Object> vars = new HashMap<>();
        vars.put("announceTitle", req.getTitle().trim());
        vars.put("announceBody",  req.getBody().trim());
        vars.put("actorName",     actorName);
        vars.put("eventTime",     LocalDateTime.now().format(
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));

        // C1915 템플릿이 비활성이면 자동 활성화 (관리자가 사용 의사 표시한 셈)
        templateRepository.findByNotificationType("C1915").ifPresent(tpl -> {
            if (!Boolean.TRUE.equals(tpl.getIsEnabled())) {
                tpl.setIsEnabled(true);
                tpl.setUpdatedAt(LocalDateTime.now());
                tpl.setUpdatedUserIdx(actorIdx);
                templateRepository.save(tpl);
                log.info("[Announce] C1915 템플릿 자동 활성화");
            }
        });

        // 1) 채널 한 건 (C2102)
        notificationEnqueueService.enqueue(NotificationCreateCommand.builder()
                .notificationType("C1915")
                .channel("C2102")
                .recipientUserIdx(null)  // 채널 발송 — 수신자 무관
                .actorUserIdx(actorIdx)
                .targetType("C1706")  // 알림 자체
                .variables(vars)
                .dedupKey("ANNOUNCE-CH:" + System.currentTimeMillis())
                .build());

        // 2) 선택 — INWEB 으로 활성 사용자 전원에게
        int inboxCount = 0;
        if (Boolean.TRUE.equals(req.getAlsoInbox())) {
            List<User> activeUsers = userRepository.findAll().stream()
                    .filter(u -> u.getDeletedAt() == null)
                    .toList();
            for (User u : activeUsers) {
                notificationEnqueueService.enqueue(NotificationCreateCommand.builder()
                        .notificationType("C1915")
                        .channel("C2103")
                        .recipientUserIdx(u.getIdx())
                        .actorUserIdx(actorIdx)
                        .targetType("C1706")
                        .variables(vars)
                        .dedupKey("ANNOUNCE-IN:" + u.getIdx() + ":" + System.currentTimeMillis())
                        .build());
                inboxCount++;
            }
        }

        log.info("[Announce] 시스템 공지 enqueue — actor={}, alsoInbox={}, inboxCount={}",
                actorIdx, req.getAlsoInbox(), inboxCount);
        return ResponseEntity.ok(Map.of(
                "channelEnqueued", true,
                "inboxEnqueued", inboxCount
        ));
    }

    // =========================================================================
    // 헬퍼
    // =========================================================================

    /** C1101/C1102 만 통과 (isAdminOrHigher = level >= 4) */
    private void assertPermission(HttpSession session) {
        if (!AuthorizationUtil.isAdminOrHigher(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "알림 관리 권한이 없습니다.");
        }
    }

    private static String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private static LocalDateTime parseStart(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s).atStartOfDay(); }
        catch (Exception e) { return null; }
    }

    private static LocalDateTime parseEndExclusive(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s).plusDays(1).atStartOfDay(); }
        catch (Exception e) { return null; }
    }

    private AdminLogEntryDto toLogDto(Notification n,
                                      Map<Long, User> userMap,
                                      Map<Long, ApprovalDocument> docMap,
                                      Map<String, String> typeNameCache,
                                      Map<String, String> statusNameCache,
                                      Map<Long, Boolean> fallbackEmittedCache) {
        User recipient = n.getRecipientUserIdx() != null ? userMap.get(n.getRecipientUserIdx()) : null;
        User actor     = n.getActorUserIdx()     != null ? userMap.get(n.getActorUserIdx())     : null;
        ApprovalDocument doc = n.getDocumentIdx() != null ? docMap.get(n.getDocumentIdx()) : null;

        String typeName   = resolveCodeName(n.getNotificationType(), typeNameCache);
        String statusName = resolveCodeName(n.getStatus(),           statusNameCache);

        Long rootIdx = n.getOriginalNotificationIdx() == null ? n.getIdx() : n.getOriginalNotificationIdx();
        boolean emitted = fallbackEmittedCache.computeIfAbsent(rootIdx,
                k -> notificationRepository.existsC1914FallbackForRoot(k));

        return AdminLogEntryDto.builder()
                .idx(n.getIdx())
                .notificationType(n.getNotificationType())
                .notificationTypeName(typeName)
                .channel(n.getChannel())
                .status(n.getStatus())
                .statusName(statusName)
                .retryCount(n.getRetryCount())
                .lastError(n.getLastError())
                .mmPostId(n.getMmPostId())
                .createdAt(n.getCreatedAt())
                .sentAt(n.getSentAt())
                .nextAttemptAt(n.getNextAttemptAt())
                .recipientUserIdx(n.getRecipientUserIdx())
                .recipientName(recipient != null ? recipient.getEmpName() : null)
                .recipientEmpId(recipient != null ? recipient.getEmpId() : null)
                .actorUserIdx(n.getActorUserIdx())
                .actorName(actor != null ? actor.getEmpName() : null)
                .documentIdx(n.getDocumentIdx())
                .documentNo(doc != null ? doc.getDocumentNo() : null)
                .actorFallbackEmitted(emitted)
                .build();
    }

    private String resolveCodeName(String code, Map<String, String> cache) {
        if (code == null) return null;
        return cache.computeIfAbsent(code, c ->
                codeRepository.findByCode(c).map(Code::getCodeName).orElse(c));
    }
}
