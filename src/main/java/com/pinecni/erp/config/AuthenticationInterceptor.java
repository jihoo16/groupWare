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
