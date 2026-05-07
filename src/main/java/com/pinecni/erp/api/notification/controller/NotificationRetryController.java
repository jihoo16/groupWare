package com.pinecni.erp.api.notification.controller;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.dto.NotificationRetryInfoDto;
import com.pinecni.erp.api.notification.event.NotificationEnqueueRequestedEvent;
import com.pinecni.erp.api.notification.repository.NotificationRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.Notification;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 사용자 측 알림 재시도 — C1914 fallback 메시지의 [다시 보내기] 링크가 도착하는 곳.
 *
 * <p>권한: 원본 알림의 actor (요청자) 만 재시도 가능. 관리자(C1101/C1102) 도 허용.
 *
 * <p>재시도 한도: 같은 root 알림에 대해 사용자 수동 재시도 5회. 자동 재시도와는 별개 카운트.
 */
@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationRetryController {

    private static final int USER_RETRY_MAX = 5;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final CodeRepository codeRepository;
    private final ApplicationEventPublisher eventPublisher;

    @GetMapping("/{idx}/retry-info")
    public ResponseEntity<NotificationRetryInfoDto> info(@PathVariable Long idx, HttpSession session) {
        Long userIdx = requireUser(session);

        Notification root = loadRootForRetry(idx);
        assertCanAccess(root, userIdx, session);

        Long rootIdx = root.getOriginalNotificationIdx() == null ? root.getIdx() : root.getOriginalNotificationIdx();
        long manualClones = notificationRepository.countByOriginalNotificationIdxAndNotificationTypeNot(
                rootIdx, "C1914");
        int userRetryCount = (int) Math.max(0, manualClones - 1);   // 첫 행은 root 자체이므로 -1
        boolean canRetry = userRetryCount < USER_RETRY_MAX;

        ApprovalDocument doc = root.getDocumentIdx() != null
                ? approvalDocumentRepository.findById(root.getDocumentIdx()).orElse(null)
                : null;
        User recipient = root.getRecipientUserIdx() != null
                ? userRepository.findById(root.getRecipientUserIdx()).orElse(null)
                : null;

        String typeName = codeRepository.findByCode(root.getNotificationType())
                .map(Code::getCodeName).orElse(root.getNotificationType());

        return ResponseEntity.ok(NotificationRetryInfoDto.builder()
                .idx(root.getIdx())
                .notificationType(root.getNotificationType())
                .notificationTypeName(typeName)
                .title(root.getTitle())
                .body(root.getBody())
                .linkUrl(root.getLinkUrl())
                .recipientUserIdx(root.getRecipientUserIdx())
                .recipientName(recipient != null ? recipient.getEmpName() : null)
                .recipientEmpId(recipient != null ? recipient.getEmpId() : null)
                .recipientDept(recipient != null ? recipient.getEmpDept() : null)
                .documentIdx(root.getDocumentIdx())
                .documentNo(doc != null ? doc.getDocumentNo() : null)
                .documentTitle(doc != null ? doc.getTitle() : null)
                .createdAt(root.getCreatedAt())
                .lastAttemptAt(root.getUpdatedAt())
                .attemptedRetryCount(root.getRetryCount())
                .failureReason(root.getLastError())
                .userRetryCount(userRetryCount)
                .userRetryMax(USER_RETRY_MAX)
                .canRetry(canRetry)
                .build());
    }

    @PostMapping("/{idx}/retry")
    @Transactional
    public ResponseEntity<Map<String, Object>> retry(@PathVariable Long idx, HttpSession session) {
        Long userIdx = requireUser(session);

        Notification root = loadRootForRetry(idx);
        assertCanAccess(root, userIdx, session);

        Long rootIdx = root.getOriginalNotificationIdx() == null ? root.getIdx() : root.getOriginalNotificationIdx();
        long manualClones = notificationRepository.countByOriginalNotificationIdxAndNotificationTypeNot(
                rootIdx, "C1914");
        int userRetryCount = (int) Math.max(0, manualClones - 1);
        if (userRetryCount >= USER_RETRY_MAX) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "수동 재시도 한도(" + USER_RETRY_MAX + "회) 를 모두 사용했습니다. 메신저로 직접 연락해 주세요.");
        }

        // 재시도 = 같은 내용으로 새 행 INSERT (PENDING) — title/body/linkUrl 은 root 의 것 재사용
        Notification clone = Notification.builder()
                .notificationType(root.getNotificationType())
                .channel(root.getChannel())
                .recipientUserIdx(root.getRecipientUserIdx())
                .isExternalRecipient(false)
                .actorUserIdx(root.getActorUserIdx())
                .targetType(root.getTargetType())
                .targetIdx(root.getTargetIdx())
                .documentIdx(root.getDocumentIdx())
                .title(root.getTitle())
                .body(root.getBody())
                .linkUrl(root.getLinkUrl())
                .payloadJson(root.getPayloadJson())
                .status("C2001")  // PENDING
                .retryCount(0)
                .originalNotificationIdx(rootIdx)
                .dedupKey("RETRY:" + rootIdx + ":" + (userRetryCount + 1))
                .createdUserIdx(userIdx)
                .build();

        Notification saved = notificationRepository.save(clone);

        // 트랜잭션 커밋 후 디스패치 트리거
        eventPublisher.publishEvent(new NotificationEnqueueRequestedEvent(saved.getIdx()));

        log.info("[Retry] 수동 재시도 — rootIdx={}, newIdx={}, userIdx={}, count={}/{}",
                rootIdx, saved.getIdx(), userIdx, userRetryCount + 1, USER_RETRY_MAX);

        return ResponseEntity.ok(Map.of(
                "newIdx",         saved.getIdx(),
                "userRetryCount", userRetryCount + 1,
                "userRetryMax",   USER_RETRY_MAX
        ));
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

    /**
     * idx 가 가리키는 알림의 root 를 반환. C1914 fallback 으로 도착한 idx 인 경우
     * original_notification_idx 를 따라 올라가 원본 알림을 가져온다.
     */
    private Notification loadRootForRetry(Long idx) {
        Notification n = notificationRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));
        if (n.getOriginalNotificationIdx() != null) {
            return notificationRepository.findById(n.getOriginalNotificationIdx()).orElse(n);
        }
        return n;
    }

    /** 원본 알림의 actor 또는 알림 관리자만 재시도 가능 */
    private static void assertCanAccess(Notification root, Long userIdx, HttpSession session) {
        if (AuthorizationUtil.isAdminOrHigher(session)) return;
        if (root.getActorUserIdx() != null && root.getActorUserIdx().equals(userIdx)) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "이 알림을 재시도할 권한이 없습니다.");
    }
}
