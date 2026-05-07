package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * [지금 나에게 테스트 발송] 결과.
 *
 * <p>발송이 끝까지 성공하면 {@code success=true} + 본인 MM 인박스로 메시지 1건 도착.
 */
@Getter
@Builder
public class TestSendResponse {

    private final boolean success;
    /** 사용자에게 보일 한국어 한 줄 (성공/실패 모두) */
    private final String  message;

    /** 어느 단계에서 실패했는지 — 실패 시에만 의미 있음 */
    private final String  failureStage;

    private final String  empId;       // 발송 대상 사번
    private final String  mmUsername;  // MM 사용자명 (보통 사번과 동일)
    private final String  mmPostId;    // 성공 시 발송된 포스트 ID
}
