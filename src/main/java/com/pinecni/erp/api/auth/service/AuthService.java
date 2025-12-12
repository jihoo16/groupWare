package com.pinecni.erp.api.auth.service;

import com.pinecni.erp.api.auth.dto.LoginRequestDTO;
import com.pinecni.erp.api.auth.dto.LoginResponseDTO;

/**
 * 인증 서비스 인터페이스
 */
public interface AuthService {

    /**
     * 로그인 처리
     *
     * @param loginRequest 로그인 요청 DTO (사번, 비밀번호)
     * @return 로그인 성공 시 사용자 정보
     * @throws IllegalArgumentException 사번이 존재하지 않거나 비밀번호가 일치하지 않는 경우
     */
    LoginResponseDTO login(LoginRequestDTO loginRequest);
}
