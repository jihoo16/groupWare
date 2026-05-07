package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.dto.BotConnectionTestResponse;
import com.pinecni.erp.api.notification.dto.TestSendResponse;

public interface BotConnectionTestService {

    /**
     * 저장된 봇 접속 정보로 Mattermost 연결을 검증한다.
     *
     * <p>1) 토큰으로 {@code GET /users/me} → 봇 인증 + 봇 식별자 자동 채움
     * <p>2) 채널 ID 가 입력돼 있으면 {@code GET /channels/{id}} → 봇이 그 채널 접근 가능한지 확인
     *
     * @param currentUserIdx 검증을 수행한 관리자 (audit)
     */
    BotConnectionTestResponse testConnection(Long currentUserIdx);

    /**
     * 현재 로그인한 사용자(=관리자) 본인의 Mattermost DM 으로 테스트 메시지 한 통을 보낸다.
     *
     * <p>경로: 사번(empId) → MM 사용자 조회 → 봇과의 DM 채널 생성/조회 → 메시지 발송.
     * 발송 경로 전체를 검증하기 위한 슬라이스.
     *
     * @param currentUserIdx 발송 대상이자 요청자 (본인에게 보냄)
     */
    TestSendResponse sendTestMessage(Long currentUserIdx);
}
