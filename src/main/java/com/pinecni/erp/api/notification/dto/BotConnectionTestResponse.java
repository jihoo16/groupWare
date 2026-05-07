package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * [봇 연결 테스트] 결과.
 *
 * <p>봇 인증 / 채널 접근 두 가지 검증을 분리해서 결과 표시. 채널 ID 가 미입력이면
 * {@code channelChecked=false} 로 응답하고 채널 부분은 화면에서 표시 안 함.
 */
@Getter
@Builder
public class BotConnectionTestResponse {

    /** 두 검증 모두 통과했는가 (채널 검증 SKIP 도 통과로 본다) */
    private final boolean success;

    // ─── 봇 인증 (GET /users/me) ───
    private final boolean botOk;
    private final String  botMessage;       // 사용자에게 보여줄 한국어 한 줄
    private final String  botResolvedUserId;   // 성공 시 자동 채워지는 봇 식별자
    private final String  botResolvedUsername; // 성공 시 봇 계정명

    // ─── 채널 접근 (GET /channels/{id}) ───
    private final boolean channelChecked;   // 채널 ID 가 입력돼 있어 검증을 시도했는가
    private final boolean channelOk;
    private final String  channelMessage;
    private final String  channelDisplayName; // 성공 시 보여줄 채널명 (예: "#town-square")
}
