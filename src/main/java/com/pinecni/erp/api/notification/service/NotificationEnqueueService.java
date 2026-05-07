package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;

import java.util.List;

/**
 * 도메인 코드가 알림을 enqueue 할 때 호출하는 진입점.
 *
 * <p>호출 시 {@code notifications} 행이 채널 수만큼 INSERT (status=PENDING) 되고,
 * 트랜잭션 커밋 후 {@link com.pinecni.erp.api.notification.event.NotificationEnqueueRequestedEvent}
 * 가 발행되어 디스패처가 비동기로 발송 시도한다.
 */
public interface NotificationEnqueueService {

    /**
     * 알림 INSERT + 이벤트 발행.
     *
     * <p>외부인 수신자, 채널 미지정 등은 행도 만들지 않고 빈 리스트 반환.
     * dedupKey 가 있고 동일 키 행이 이미 있으면 그 채널은 SKIP.
     *
     * @return INSERT 된 알림 idx 목록 (채널 수만큼)
     */
    List<Long> enqueue(NotificationCreateCommand cmd);
}
