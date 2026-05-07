package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.notification.dto.NotificationSettingsResponse;
import com.pinecni.erp.api.notification.dto.NotificationSettingsUpdateRequest;
import com.pinecni.erp.api.notification.service.NotificationSettingsService;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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
}
