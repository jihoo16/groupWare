package com.pinecni.erp.api.signature.scheduler;

import com.pinecni.erp.api.signature.repository.SignatureSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 만료된 서명 세션 정리 스케줄러
 * - 5분마다 expires_at이 지난 세션을 C1305(만료)로 전환
 * - expires_at 경과 후에도 세션이 종료 상태가 아닌 경우 대상
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SignatureSessionCleanupScheduler {

    private final SignatureSessionRepository signatureSessionRepository;

    /**
     * 5분 주기로 만료 세션 일괄 EXPIRED 처리
     */
    @Scheduled(fixedRate = 5 * 60 * 1000L, initialDelay = 60 * 1000L)
    @Transactional
    public void cleanExpiredSessions() {
        LocalDateTime now = LocalDateTime.now();
        int updated = signatureSessionRepository.markExpiredSessions(now);
        if (updated > 0) {
            log.info("만료 세션 정리 완료: {}건", updated);
        }
    }
}
