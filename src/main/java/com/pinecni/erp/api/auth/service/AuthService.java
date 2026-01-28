package com.pinecni.erp.api.auth.service;

import com.pinecni.erp.api.auth.dto.ChangePasswordRequestDTO;
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

    /**
     * 비밀번호 변경
     *
     * @param userIdx 사용자 인덱스
     * @param request 비밀번호 변경 요청 DTO
     * @throws IllegalArgumentException 현재 비밀번호가 일치하지 않거나 유효성 검증 실패 시
     */
    void changePassword(Long userIdx, ChangePasswordRequestDTO request);
}
