package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.event.NotificationEnqueueRequestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * 도메인 트랜잭션이 커밋된 후 디스패치를 트리거.
 *
 * <p>{@code @TransactionalEventListener(AFTER_COMMIT)} 로 트랜잭션 롤백 시
 * 알림 발송이 일어나지 않도록 보장. {@code @Async("mattermostExecutor")} 로
 * 도메인 응답 시간이 MM HTTP 호출에 묶이지 않도록 격리.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEnqueueListener {

    private final NotificationDispatcher dispatcher;

    @Async("mattermostExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onEnqueueRequested(NotificationEnqueueRequestedEvent event) {
        try {
            dispatcher.dispatch(event.notificationIdx());
        } catch (Exception e) {
            // dispatcher 가 모든 예외를 자체적으로 처리해야 하지만, 안전 그물
            log.error("[Listener] 디스패치 중 처리되지 않은 예외 — notificationIdx={}",
                    event.notificationIdx(), e);
        }
    }
}
