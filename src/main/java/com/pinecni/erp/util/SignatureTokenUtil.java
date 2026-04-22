package com.pinecni.erp.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * 전자서명 세션 토큰 유틸리티
 *
 * <p>토큰 특성:
 * <ul>
 *   <li>UUID v4 (36자, 122비트 랜덤) - 예측 불가</li>
 *   <li>1회성 - COMPLETED/EXPIRED 상태 토큰 재사용 차단 (서비스 레벨)</li>
 *   <li>유효기간 - expires_at 컬럼으로 관리 (서비스 레벨)</li>
 *   <li>사용자 바인딩 - signer_user_idx로 특정 사용자에게만 유효 (서비스 레벨)</li>
 * </ul>
 */
@Slf4j
@Component
public class SignatureTokenUtil {

    /**
     * UUID 기반 고유 토큰 생성
     *
     * @return 36자 UUID 문자열 (예: "a3f8c2d1-9b4e-4f7a-b8c3-1234567890ab")
     */
    public String generateToken() {
        return UUID.randomUUID().toString();
    }

    /**
     * 토큰 형식 검증 (UUID 형식 준수 여부)
     * - DB 조회 전 기본 검증용
     */
    public boolean isValidFormat(String token) {
        if (token == null || token.length() != 36) {
            return false;
        }
        try {
            UUID.fromString(token);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
