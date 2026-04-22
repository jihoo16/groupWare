package com.pinecni.erp.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 인증 인터셉터
 * 세션에 로그인 정보가 없는 경우 로그인 페이지로 리다이렉트
 */
@Slf4j
@Component
public class AuthenticationInterceptor implements HandlerInterceptor {

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
}
