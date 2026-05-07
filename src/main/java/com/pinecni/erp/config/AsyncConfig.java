package com.pinecni.erp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.aop.interceptor.SimpleAsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 비동기 작업 설정
 *
 * <p>주 용도:
 * <ul>
 *     <li>감사 로그 기록 (AuditLogService) - 메인 트랜잭션과 분리하여 로그 실패가 비즈니스 로직에 영향 주지 않게</li>
 *     <li>서명 완료 후 PDF 자동 생성 (카테고리 B 문서) - Playwright PDF 렌더링이 길어서 응답 지연 방지</li>
 *     <li>WebSocket 알림 발송 - 서명 이벤트 전파</li>
 * </ul>
 *
 * <p>기본 Executor는 일반 @Async용, auditLogExecutor는 감사 로그 전용 분리.
 */
@Slf4j
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    /**
     * 기본 비동기 Executor (일반 @Async용)
     */
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    /**
     * 감사 로그 전용 Executor
     * - 별도 스레드 풀로 분리하여 다른 @Async 작업과 독립적으로 처리
     * - 큐 용량이 크므로 일시적 부하에도 손실 방지
     */
    @Bean(name = "auditLogExecutor")
    public Executor auditLogExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("audit-log-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    /**
     * Mattermost 알림 발송 전용 Executor
     * - 외부(MM) HTTP 호출이 응답 시간을 지연시키지 않게 메인 트랜잭션과 분리
     * - 일반 @Async / 감사 로그와 격리하여 MM 장애 시 다른 비동기 작업이 영향받지 않게
     * - 큐 용량은 일시적 폭주에 대비 (실패해도 RETRY_WAIT 로 다시 시도되므로 손실 위험은 작음)
     */
    @Bean(name = "mattermostExecutor")
    public Executor mattermostExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("mm-notif-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    /**
     * @Async 메서드에서 발생한 예외 처리
     * - 로그 남기고 삼킴 (비즈니스 로직에 영향 없도록)
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, params) -> {
            log.error("[Async 작업 실패] method={}, params={}, error={}",
                    method.getName(), params, throwable.getMessage(), throwable);
        };
    }
}
