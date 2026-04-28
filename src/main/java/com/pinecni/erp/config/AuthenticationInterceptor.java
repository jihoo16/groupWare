package com.pinecni.erp.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 인증 인터셉터
 * 세션에 로그인 정보가 없는 경우 로그인 페이지로 리다이렉트
 */
@Slf4j
@Component
public class AuthenticationInterceptor implements HandlerInterceptor {

    /**
     * 서버 자기 자신이 자동 PDF 생성을 위해 자기 페이지를 호출할 때 사용하는 토큰.
     * X-Internal-PDF-Token 헤더 + 127.0.0.1 출발지일 때만 인증 스킵.
     */
    @Value("${pdf.internal.token:}")
    private String internalPdfToken;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestURI = request.getRequestURI();
        HttpSession session = request.getSession(false);

        log.debug("Authentication check for URI: {}", requestURI);

        // 전자서명 관련 경로는 세션 인증 없이 토큰 기반으로 접근 (모바일 QR 스캔)
        if (requestURI.startsWith("/sign/") || requestURI.startsWith("/api/signature/session/")
                || requestURI.startsWith("/ws/signature")) {
            log.debug("서명 경로 인증 스킵: {}", requestURI);
            return true;
        }

        // 내부 자동 PDF 생성 (Playwright → 자기 자신): 토큰 + 127.0.0.1 출발지 검증
        if (isInternalPdfRequest(request)) {
            log.debug("내부 PDF 생성 요청 — 인증 스킵: {}", requestURI);
            return true;
        }

        // 개발용: X-Dev-Bypass 헤더가 있으면 인증 패스
        String devBypass = request.getHeader("X-Dev-Bypass");
        if ("true".equalsIgnoreCase(devBypass)) {
            log.warn("DEV MODE: Authentication bypassed for URI: {}", requestURI);
            return true;
        }

        // 세션이 없거나 user 정보가 없는 경우
        if (session == null || session.getAttribute("user") == null) {
            log.info("Unauthenticated access attempt to: {}", requestURI);
            response.sendRedirect("/login");
            return false;
        }

        log.debug("Authenticated user: {}", session.getAttribute("empId"));
        return true;
    }

    /**
     * X-Internal-PDF-Token 헤더가 설정값과 일치하고 요청 출발지가 127.0.0.1 (또는 ::1) 일 때만 통과.
     * 토큰 미설정 시 항상 false.
     */
    private boolean isInternalPdfRequest(HttpServletRequest request) {
        if (internalPdfToken == null || internalPdfToken.isBlank()) return false;
        String headerToken = request.getHeader("X-Internal-PDF-Token");
        if (headerToken == null || !internalPdfToken.equals(headerToken)) return false;
        String remoteAddr = request.getRemoteAddr();
        return "127.0.0.1".equals(remoteAddr) || "0:0:0:0:0:0:0:1".equals(remoteAddr) || "::1".equals(remoteAddr);
    }
}
