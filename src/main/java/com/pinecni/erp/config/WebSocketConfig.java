package com.pinecni.erp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket + STOMP 설정
 *
 * <p>용도:
 * <ul>
 *   <li>QR 서명 완료 이벤트를 PC 화면으로 실시간 전파</li>
 *   <li>모바일 QR 스캔/인증/서명 완료 상태를 PC 모달에 반영</li>
 * </ul>
 *
 * <p>토픽 구조:
 * <pre>
 *   /topic/signature/{documentIdx}     - 특정 문서의 서명 이벤트 (PC가 구독)
 *   /topic/signature/session/{token}   - 특정 세션의 스캔/인증 이벤트 (PC 모달이 구독)
 *   /queue/signature/notifications/{userIdx} - 사용자별 서명 요청 알림
 * </pre>
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 서버 → 클라이언트 메시지 경로
        config.enableSimpleBroker("/topic", "/queue");

        // 클라이언트 → 서버 메시지 경로 prefix (@MessageMapping)
        // 현재는 서버→클라이언트 단방향 알림만 사용하지만 미래 확장용
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket 엔드포인트 (SockJS fallback 포함)
        // 모바일에서 접근 가능해야 하므로 CORS 허용
        registry.addEndpoint("/ws/signature")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        log.info("WebSocket 엔드포인트 등록 완료: /ws/signature");
    }
}
