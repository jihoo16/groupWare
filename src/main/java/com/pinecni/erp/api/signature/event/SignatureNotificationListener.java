package com.pinecni.erp.api.signature.event;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.service.NotificationEnqueueService;
import com.pinecni.erp.api.signature.service.SignatureService;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * {@link SignatureCompletedEvent} 리스너 — 모든 서명 완료 시 작성자(drafter) 에게 C1903 알림.
 *
 * <p>{@link SignatureCompletedListener} (자동 PDF 생성용) 와 별개로 동작. 둘 다 같은 이벤트를 듣는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SignatureNotificationListener {

    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final SignatureService signatureService;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final UserRepository userRepository;
    private final NotificationEnqueueService notificationEnqueueService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSignatureCompleted(SignatureCompletedEvent event) {
        Long documentIdx = event.documentIdx();
        try {
            // 모든 서명이 실제로 완료된 시점인지 재확인 (개별 제출마다 이벤트 발행됨)
            if (!signatureService.isAllSignaturesComplete(documentIdx)) return;

            ApprovalDocument doc = approvalDocumentRepository.findById(documentIdx).orElse(null);
            if (doc == null || doc.getDrafterUserIdx() == null) return;

            String recipientName = userRepository.findById(doc.getDrafterUserIdx())
                    .map(User::getEmpName).orElse("");
            String deepLink = com.pinecni.erp.api.signature.service.SignatureServiceImpl
                    .approvalDeepLink(doc.getDocumentType(), doc.getIdx());

            Map<String, Object> vars = new LinkedHashMap<>();
            vars.put("recipientName",    recipientName);
            vars.put("documentTitle",    safe(doc.getTitle(), "문서"));
            vars.put("documentNo",       safe(doc.getDocumentNo(), ""));
            vars.put("eventTime",        LocalDateTime.now().format(TIME_FMT));
            vars.put("documentTypePath", "");
            vars.put("documentIdx",      doc.getIdx());
            vars.put("deepLink",         deepLink);

            notificationEnqueueService.enqueue(NotificationCreateCommand.builder()
                    .notificationType("C1903")
                    .channel("C2101")
                    .channel("C2103")
                    .recipientUserIdx(doc.getDrafterUserIdx())
                    .actorUserIdx(doc.getDrafterUserIdx())  // self
                    .targetType("C1701")  // approval_documents
                    .targetIdx(doc.getIdx())
                    .documentIdx(doc.getIdx())
                    .variables(vars)
                    .dedupKey("SIGCOMPLETE:" + doc.getIdx())
                    .build());

            log.info("[서명완료 알림] enqueue — documentIdx={}, drafterIdx={}",
                    documentIdx, doc.getDrafterUserIdx());
        } catch (Exception e) {
            log.error("[서명완료 알림] enqueue 실패 — documentIdx={}", documentIdx, e);
        }
    }

    private static String safe(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s;
    }
}
