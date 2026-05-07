package com.pinecni.erp.api.notification.event;

/**
 * 알림 행이 INSERT 된 직후 발행되는 이벤트.
 *
 * <p>{@link com.pinecni.erp.api.notification.service.NotificationEnqueueService}
 * 가 트랜잭션 내에서 발행하고,
 * {@link com.pinecni.erp.api.notification.service.NotificationEnqueueListener}
 * 가 {@code @TransactionalEventListener(AFTER_COMMIT)} 로 받아서 비동기 디스패치를 트리거한다.
 *
 * <p>커밋 후에 처리하는 이유: 도메인 트랜잭션이 롤백되면 알림도 발송되면 안 되기 때문.
 */
public record NotificationEnqueueRequestedEvent(Long notificationIdx) {
}
