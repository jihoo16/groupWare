package com.pinecni.erp.api.auth.service;

import com.pinecni.erp.api.auth.dto.LoginRequestDTO;
import com.pinecni.erp.api.auth.dto.LoginResponseDTO;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.user.service.UserServiceImpl;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 인증 서비스 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserServiceImpl userService;
    private final CodeRepository codeRepository;

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO loginRequest) {
        log.info("Login attempt - empId: {}", loginRequest.getEmpId());

        // 1. 사용자 조회
        User user = userRepository.findByEmpId(loginRequest.getEmpId())
                .orElseThrow(() -> {
                    log.warn("Login failed - User not found: {}", loginRequest.getEmpId());
                    return new IllegalArgumentException("사번 또는 비밀번호가 올바르지 않습니다.");
                });

        // 2. 비밀번호 검증 (Salt 방식)
        boolean isPasswordValid = userService.verifyPassword(
                loginRequest.getPassword(),
                user.getPassword(),
                user.getPasswordHash()
        );

        if (!isPasswordValid) {
            log.warn("Login failed - Invalid password for user: {}", loginRequest.getEmpId());
            throw new IllegalArgumentException("사번 또는 비밀번호가 올바르지 않습니다.");
        }

        // 3. 재직 상태 확인
        if (!"재직".equals(user.getEmpStatus())) {
            log.warn("Login failed - User is not active: {} (status: {})",
                    loginRequest.getEmpId(), user.getEmpStatus());
            throw new IllegalArgumentException("재직 중인 사용자만 로그인할 수 있습니다.");
        }

        // 4. 삭제된 사용자 확인
        if (user.getDeletedAt() != null) {
            log.warn("Login failed - User is deleted: {}", loginRequest.getEmpId());
            throw new IllegalArgumentException("삭제된 사용자입니다. 관리자에게 문의하세요.");
        }

        // 5. 최종 로그인 시간 업데이트
        user.setLastLoginDate(LocalDateTime.now());
        userRepository.save(user);

        // 6. 응답 DTO 생성
        LoginResponseDTO response = LoginResponseDTO.builder()
                .idx(user.getIdx())
                .empId(user.getEmpId())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empPosition(user.getEmpPosition())
                .empEmail(user.getEmpEmail())
                .isAdmin(user.getIsAdmin())
                .message("로그인 성공")
                .build();

        // 부서 코드명 조회
        if (user.getEmpDept() != null) {
            codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                    .ifPresent(code -> response.setEmpDeptName(code.getCodeName()));
        }

        // 직급 코드명 조회
        if (user.getEmpPosition() != null) {
            codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                    .ifPresent(code -> response.setEmpPositionName(code.getCodeName()));
        }

        log.info("Login successful - userIdx : {}, empId: {}, empName: {}", user.getIdx(), user.getEmpId(), user.getEmpName());
        return response;
    }
}
