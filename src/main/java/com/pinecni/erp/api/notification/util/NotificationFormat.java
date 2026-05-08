package com.pinecni.erp.api.notification.util;

import java.time.format.DateTimeFormatter;

/**
 * 알림 도메인에서 자주 쓰는 날짜·시간 포맷을 한 곳에서 관리.
 *
 * <p>각 enqueue 헬퍼가 자체로 {@code DateTimeFormatter.ofPattern(...)} 을 인라인으로 만들지 않도록
 * 모든 알림 본문 변수와 dedupKey timestamp 가 같은 포맷을 공유하게 한다.
 */
public final class NotificationFormat {

    /** 알림 본문에 표시되는 사건 발생 시각 — 예: {@code 2026-05-08 14:30} */
    public static final DateTimeFormatter EVENT_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** 알림 본문에 표시되는 날짜 단독 — 예: {@code 2026-05-08} */
    public static final DateTimeFormatter EVENT_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** 알림 dedupKey 끝에 붙이는 timestamp 부분 — 예: {@code 20260508143015} */
    public static final DateTimeFormatter DEDUP_TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private NotificationFormat() {
        // utility
    }
}
