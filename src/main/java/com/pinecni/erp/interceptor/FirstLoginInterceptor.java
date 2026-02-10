package com.pinecni.erp.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 최초 로그인 시 비밀번호 변경 강제 인터셉터
 * - 세션에 isFirstLogin이 true인 경우 비밀번호 변경 페이지로 강제 리다이렉트
 * - 비밀번호 변경 전까지 다른 모든 페이지 접근 차단
 */
@Slf4j
@Component
public class FirstLoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession(false);

        if (session == null) {
            return true; // 세션이 없으면 통과
        }

        Boolean isFirstLogin = (Boolean) session.getAttribute("isFirstLogin");
        String requestURI = request.getRequestURI();

        // 최초 로그인이 아니거나 세션에 플래그가 없으면 통과
        if (isFirstLogin == null || !isFirstLogin) {
            return true;
        }

        // 최초 로그인 상태에서 허용되는 경로들
        if (isAllowedPath(requestURI)) {
            return true;
        }

        // 그 외 모든 경로는 차단하고 비밀번호 변경 페이지로 리다이렉트
        log.warn("First login user attempted to access restricted page: {} - Redirecting to /first-setting", requestURI);
        response.sendRedirect("/first-setting");
        return false;
    }

    /**
     * 최초 로그인 상태에서 허용되는 경로 체크
     */
    private boolean isAllowedPath(String requestURI) {
        // 최초 설정 페이지는 허용
        if (requestURI.equals("/first-setting")) {
            return true;
        }

        // 사용자 정보 조회/수정 API는 허용 (페이지에서 직접 호출)
        if (requestURI.equals("/api/users/me")) {
            return true;
        }

        // 비밀번호 변경 API는 허용
        if (requestURI.equals("/api/auth/change-password")) {
            return true;
        }

        // 로그아웃은 허용
        if (requestURI.equals("/api/auth/logout")) {
            return true;
        }

        // 정적 리소스는 허용 (CSS, JS, 이미지 등)
        if (requestURI.startsWith("/css/") ||
            requestURI.startsWith("/js/") ||
            requestURI.startsWith("/images/") ||
            requestURI.startsWith("/fonts/") ||
            requestURI.startsWith("/favicon.ico")) {
            return true;
        }

        return false;
    }
}
