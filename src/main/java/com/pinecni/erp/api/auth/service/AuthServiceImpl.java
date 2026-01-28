package com.pinecni.erp.api.auth.service;

import com.pinecni.erp.api.auth.dto.ChangePasswordRequestDTO;
import com.pinecni.erp.api.auth.dto.LoginRequestDTO;
import com.pinecni.erp.api.auth.dto.LoginResponseDTO;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.user.service.UserServiceImpl;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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
    @Transactional(readOnly = false)
    public LoginResponseDTO login(LoginRequestDTO loginRequest) {
        log.info("Login attempt - identifier: {}", loginRequest.getEmpId());

        // 1. 사용자 조회 (사번 또는 이메일)
        User user = userRepository.findByEmpId(loginRequest.getEmpId())
                .or(() -> userRepository.findByEmpEmail(loginRequest.getEmpId()))
                .orElseThrow(() -> {
                    log.warn("Login failed - User not found: {}", loginRequest.getEmpId());
                    return new IllegalArgumentException("사번/이메일 또는 비밀번호가 올바르지 않습니다.");
                });

        // 2. 비밀번호 검증 (Salt 방식)
        boolean isPasswordValid = userService.verifyPassword(
                loginRequest.getPassword(),
                user.getPassword(),
                user.getPasswordHash()
        );

        if (!isPasswordValid) {
            log.warn("Login failed - Invalid password for user: {}", loginRequest.getEmpId());
            throw new IllegalArgumentException("사번/이메일 또는 비밀번호가 올바르지 않습니다.");
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

        // 5. 최초 로그인 여부 체크 (last_login_date가 null인 경우)
        boolean isFirstLogin = (user.getLastLoginDate() == null);

        // 6. 최종 로그인 시간 업데이트 (최초 로그인이 아닌 경우에만)
        // 최초 로그인 시에는 비밀번호 변경 완료 후에 업데이트
        if (!isFirstLogin) {
            LocalDateTime loginTime = LocalDateTime.now();
            user.setLastLoginDate(loginTime);
            userRepository.save(user);
            log.info("Updated last login date for user: {} to {}", user.getEmpId(), loginTime);
        } else {
            log.info("First login for user: {} - last_login_date will be updated after password change", user.getEmpId());
        }

        // 7. 응답 DTO 생성
        LoginResponseDTO response = LoginResponseDTO.builder()
                .idx(user.getIdx())
                .empId(user.getEmpId())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empPosition(user.getEmpPosition())
                .empEmail(user.getEmpEmail())
                .isAdmin(user.getIsAdmin())
                .isFirstLogin(isFirstLogin)
                .message("로그인 성공")
                .build();

        // 부서 코드명 조회
        if (user.getEmpDept() != null) {
            codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                    .ifPresent(code -> response.setEmpDeptName(code.getCodeName()));
        }

        // 직급 코드명 조회
        if (user.getEmpPosition() != null) {
            codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                    .ifPresent(code -> response.setEmpPositionName(code.getCodeName()));
        }

        log.info("Login successful - userIdx : {}, empId: {}, empName: {}", user.getIdx(), user.getEmpId(), user.getEmpName());
        return response;
    }

    @Override
    @Transactional(readOnly = false)
    public void changePassword(Long userIdx, ChangePasswordRequestDTO request) {
        log.info("Change password attempt for userIdx: {}", userIdx);

        // 1. 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", userIdx);
                    return new IllegalArgumentException("사용자를 찾을 수 없습니다.");
                });

        // 2. 현재 비밀번호 검증 (최초 로그인이 아닌 경우에만)
        if (request.getCurrentPassword() != null && !request.getCurrentPassword().isEmpty()) {
            boolean isCurrentPasswordValid = userService.verifyPassword(
                    request.getCurrentPassword(),
                    user.getPassword(),
                    user.getPasswordHash()
            );

            if (!isCurrentPasswordValid) {
                log.warn("Current password verification failed for userIdx: {}", userIdx);
                throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
            }
        }

        // 3. 새 비밀번호와 확인 비밀번호 일치 확인
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            log.warn("New password and confirm password do not match for userIdx: {}", userIdx);
            throw new IllegalArgumentException("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        // 4. 새 비밀번호 해시 생성 (Salt 방식)
        try {
            String salt = user.getPasswordHash(); // 기존 salt 재사용

            // UserServiceImpl과 동일한 방식으로 해싱: password + salt를 문자열로 합침
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String passwordWithSalt = request.getNewPassword() + salt;
            byte[] hashedBytes = md.digest(passwordWithSalt.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            StringBuilder sb = new StringBuilder();
            for (byte b : hashedBytes) {
                sb.append(String.format("%02x", b));
            }
            String hashedPassword = sb.toString();

            // 5. 비밀번호 업데이트
            user.setPassword(hashedPassword);

            // 6. 최초 로그인 시 last_login_date 업데이트
            if (user.getLastLoginDate() == null) {
                LocalDateTime now = LocalDateTime.now();
                user.setLastLoginDate(now);
                log.info("First password change completed - updating last_login_date for userIdx: {} to {}", userIdx, now);
            }

            userRepository.save(user);

            log.info("Password changed successfully for userIdx: {}", userIdx);

        } catch (NoSuchAlgorithmException e) {
            log.error("Failed to hash password", e);
            throw new RuntimeException("비밀번호 암호화 중 오류가 발생했습니다.");
        }
    }
}
