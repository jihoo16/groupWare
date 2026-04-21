package com.pinecni.erp.service;

import com.pinecni.erp.api.signature.dto.SignatureEventMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * 서명 이벤트 WebSocket 알림 발송
 *
 * <p>PC 화면은 다음 토픽을 구독:
 * <ul>
 *   <li>/topic/signature/session/{token} - 특정 세션 이벤트 (QR 모달)</li>
 *   <li>/topic/signature/{documentIdx} - 특정 문서 전체 이벤트 (상세 페이지)</li>
 *   <li>/queue/signature/notifications/{userIdx} - 사용자별 서명 요청 알림</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SignatureWebSocketNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 세션 단위 이벤트 발송 (QR 모달용)
     * - SCANNED / VERIFIED / VERIFY_FAILED / COMPLETED / EXPIRED / CANCELLED
     */
    public void sendSessionEvent(String sessionToken, SignatureEventMessage event) {
        String destination = "/topic/signature/session/" + sessionToken;
        log.debug("세션 이벤트 발송: {} → {}", event.getEventType(), destination);
        try {
            messagingTemplate.convertAndSend(destination, event);
        } catch (Exception e) {
            log.error("세션 이벤트 발송 실패: sessionToken={}, eventType={}, error={}",
                    sessionToken, event.getEventType(), e.getMessage(), e);
        }
    }

    /**
     * 문서 단위 이벤트 발송 (문서 상세 페이지용)
     * - 해당 문서를 보고 있는 모든 사용자에게 서명 완료 이벤트 전파
     */
    public void sendDocumentEvent(Long documentIdx, SignatureEventMessage event) {
        String destination = "/topic/signature/" + documentIdx;
        log.debug("문서 이벤트 발송: {} → {}", event.getEventType(), destination);
        try {
            messagingTemplate.convertAndSend(destination, event);
        } catch (Exception e) {
            log.error("문서 이벤트 발송 실패: documentIdx={}, eventType={}, error={}",
                    documentIdx, event.getEventType(), e.getMessage(), e);
        }
    }

    /**
     * 사용자별 서명 요청 알림 발송 (홈 화면 배지 갱신)
     * - 알림 건수만 갱신 신호, 실제 목록은 REST로 재조회
     */
    public void sendUserNotification(Long userIdx, String eventType) {
        String destination = "/queue/signature/notifications/" + userIdx;
        log.debug("사용자 알림 발송: {} → {}", eventType, destination);
        try {
            messagingTemplate.convertAndSend(destination,
                    SignatureEventMessage.builder()
                            .eventType(eventType)
                            .timestamp(java.time.LocalDateTime.now())
                            .build());
        } catch (Exception e) {
            log.error("사용자 알림 발송 실패: userIdx={}, eventType={}, error={}",
                    userIdx, eventType, e.getMessage(), e);
        }
    }
}
