package com.pinecni.erp.api.notification.service;

public interface NotificationSubscriptionService {

    /**
     * 신규 사용자에게 기본 구독 행 (15종 × 2채널 = 30건) 을 INSERT.
     *
     * <p>UserServiceImpl.createUser() 가 호출 — 새 직원 입사 시 알림 받을 수 있게.
     *
     * <p>기본값:
     * <ul>
     *   <li>{@code is_enabled = TRUE} (모든 알림 받음으로 시작)</li>
     *   <li>{@code is_force_send = TRUE} 단, {@code C1915 시스템공지} 만; 그 외는 FALSE</li>
     *   <li>quiet_hours 는 NULL (방해금지 미사용)</li>
     * </ul>
     *
     * <p>이미 행이 있으면 SKIP — 멱등.
     */
    void createDefaultsFor(Long userIdx);
}
