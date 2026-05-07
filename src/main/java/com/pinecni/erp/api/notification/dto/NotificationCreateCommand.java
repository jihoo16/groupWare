package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Singular;

import java.util.List;
import java.util.Map;

/**
 * 도메인 코드가 알림을 enqueue 할 때 사용하는 입력 명령.
 *
 * <p>예) 서명 요청이 생성되면 SignatureService 가
 * {@code notificationEnqueueService.enqueue(NotificationCreateCommand.builder()...build())} 호출.
 */
@Getter
@Builder
public class NotificationCreateCommand {

    /** C19 알림유형 (예: C1901 서명요청) — 필수 */
    private final String notificationType;

    /**
     * 발송 채널 목록 (C21). 비어있으면 발송 안 함.
     * 예: [C2101 (MM DM)] 또는 [C2101, C2103 (인박스)] — 둘 다 켜진 경우 행 2개 INSERT.
     */
    @Singular("channel")
    private final List<String> channels;

    /** 수신자 user.idx. 외부인 알림이면 null + isExternalRecipient=true */
    private final Long recipientUserIdx;

    /** 외부인 알림 플래그 — true 면 발송 SKIP (외부인은 MM 계정 없음) */
    @Builder.Default
    private final boolean externalRecipient = false;

    /** 알림을 발생시킨 사람 (서명자/처리자/기안자). C1914 fallback 의 수신자가 됨 */
    private final Long actorUserIdx;

    /** C17 감사대상유형 (예: C1702 signature_requests) */
    private final String targetType;

    private final Long targetIdx;

    /** 비정규화 — 관련 결재문서 idx (조회 성능용). 없으면 null */
    private final Long documentIdx;

    /**
     * 템플릿 변수 맵. {@link com.pinecni.erp.api.notification.service.NotificationRenderer}
     * 가 [[${변수명}]] 자리표시자에 채워넣음.
     */
    @Singular
    private final Map<String, Object> variables;

    /**
     * 멱등 키 (예: SIGREQ:1234). 채널 suffix(:MM/:INWEB) 는 enqueue 가 자동 부착.
     * 없어도 동작은 하지만 중복 INSERT 방지를 위해 가능하면 채울 것.
     */
    private final String dedupKey;

    /**
     * retry / C1914 cascade 의 root 알림 idx. 본인이 root 면 null.
     * 도메인 코드가 직접 enqueue 할 때는 보통 null. 디스패처 retry 경로에서 채움.
     */
    private final Long originalNotificationIdx;

    /** 강제 발송 플래그 — true 면 사용자 OFF / 방해금지 무시. 시스템공지(C1915) 등에서 사용 */
    @Builder.Default
    private final boolean forceSend = false;
}
