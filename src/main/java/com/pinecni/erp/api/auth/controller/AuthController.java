package com.pinecni.erp.api.auth.controller;

import com.pinecni.erp.api.auth.dto.ChangePasswordRequestDTO;
import com.pinecni.erp.api.auth.dto.LoginRequestDTO;
import com.pinecni.erp.api.auth.dto.LoginResponseDTO;
import com.pinecni.erp.api.auth.service.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 인증 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 로그인
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(
            @Valid @RequestBody LoginRequestDTO loginRequest,
            HttpSession session) {

        log.debug("POST /api/auth/login - empId: {}", loginRequest.getEmpId());

        // 로그인 처리
        LoginResponseDTO response = authService.login(loginRequest);

        // 세션에 사용자 정보 저장
        session.setAttribute("user", response);
        session.setAttribute("empId", response.getEmpId());
        session.setAttribute("userIdx", response.getIdx());
        session.setAttribute("empName", response.getEmpName());
        session.setAttribute("isAdmin", response.getIsAdmin());
        session.setAttribute("isFirstLogin", response.getIsFirstLogin()); // 최초 로그인 플래그
        session.setMaxInactiveInterval(3600 * 8); // 8시간

        log.info("Session created for user: {} (session ID: {}, isFirstLogin: {})",
                response.getEmpId(), session.getId(), response.getIsFirstLogin());

        return ResponseEntity.ok(response);
    }

    /**
     * 로그아웃
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpSession session) {
        String empId = (String) session.getAttribute("empId");
        log.info("POST /api/auth/logout - empId: {}", empId);

        // 세션 무효화
        session.invalidate();

        Map<String, String> response = new HashMap<>();
        response.put("message", "로그아웃되었습니다.");

        return ResponseEntity.ok(response);
    }

    /**
     * 현재 로그인 사용자 정보 조회
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<LoginResponseDTO> getCurrentUser(HttpSession session) {
        LoginResponseDTO user = (LoginResponseDTO) session.getAttribute("user");

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(user);
    }

    /**
     * 세션 유효성 확인
     * GET /api/auth/check
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkSession(HttpSession session) {
        LoginResponseDTO user = (LoginResponseDTO) session.getAttribute("user");

        Map<String, Object> response = new HashMap<>();
        response.put("isAuthenticated", user != null);

        if (user != null) {
            response.put("empId", user.getEmpId());
            response.put("empName", user.getEmpName());
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 비밀번호 변경
     * POST /api/auth/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequestDTO request,
            HttpSession session) {

        Long userIdx = (Long) session.getAttribute("userIdx");

        if (userIdx == null) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인이 필요합니다.");
            return ResponseEntity.status(401).body(error);
        }

        log.debug("POST /api/auth/change-password - userIdx: {}", userIdx);

        // 비밀번호 변경 처리
        authService.changePassword(userIdx, request);

        // 최초 로그인 플래그 제거 (비밀번호 변경 완료)
        session.setAttribute("isFirstLogin", false);
        log.info("First login flag removed for userIdx: {}", userIdx);

        Map<String, String> response = new HashMap<>();
        response.put("message", "비밀번호가 성공적으로 변경되었습니다.");

        return ResponseEntity.ok(response);
    }

    /**
     * Exception Handler
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("Login failed: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.status(401).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error during authentication", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "로그인 처리 중 오류가 발생했습니다.");
        return ResponseEntity.status(500).body(error);
    }
}
