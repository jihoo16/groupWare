package com.pinecni.erp.config;

import com.pinecni.erp.interceptor.FirstLoginInterceptor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 설정
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthenticationInterceptor authenticationInterceptor;
    private final FirstLoginInterceptor firstLoginInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        log.info("Registering interceptors");

        // 1. 인증 인터셉터 (로그인 체크)
        registry.addInterceptor(authenticationInterceptor)
                .addPathPatterns("/**")  // 모든 경로에 적용
                .excludePathPatterns(
                        "/login",           // 로그인 페이지
                        "/api/auth/**",     // 인증 API
                        "/api/health",      // Health check API
                        "/api/users",       // 사용자 목록 API (개발용)
                        "/api/vacation/generate-all-schedules", // 연차 초기 데이터 생성 (일회성)
                        "/css/**",          // CSS 정적 리소스
                        "/js/**",           // JavaScript 정적 리소스
                        "/images/**",       // 이미지 정적 리소스
                        "/favicon.ico",     // 파비콘
                        "/favicon.svg",     // 파비콘 SVG
                        "/error",           // 에러 페이지
                        // ===== 전자서명 모바일 페이지 (QR 스캔 후 토큰 기반 접근) =====
                        "/sign/**",                                  // 모바일 서명 페이지
                        "/api/signature/session/*/scan",             // QR 스캔 확인
                        "/api/signature/session/*/verify",           // 사번 2차 인증
                        "/api/signature/session/*/submit",           // 서명 제출
                        "/api/signature/session/*/status",           // 세션 상태 폴링 (fallback)
                        "/api/signature/session/by-token/**",        // 토큰 기반 세션 정보 조회
                        "/ws/signature/**"                           // WebSocket 엔드포인트
                )
                .order(1);

        // 2. 최초 로그인 인터셉터 (비밀번호 변경 강제)
        registry.addInterceptor(firstLoginInterceptor)
                .addPathPatterns("/**")  // 모든 경로에 적용
                .excludePathPatterns(
                        "/login",           // 로그인 페이지
                        "/first-setting",   // 최초 로그인 설정 페이지
                        "/api/auth/**",     // 인증 API (로그인, 비밀번호 변경 등)
                        "/api/health",      // Health check API
                        "/css/**",          // CSS 정적 리소스
                        "/js/**",           // JavaScript 정적 리소스
                        "/images/**",       // 이미지 정적 리소스
                        "/fonts/**",        // 폰트 정적 리소스
                        "/favicon.ico",     // 파비콘
                        "/favicon.svg",     // 파비콘 SVG
                        "/error",           // 에러 페이지
                        // ===== 전자서명 모바일 페이지 =====
                        "/sign/**",
                        "/api/signature/session/*/scan",
                        "/api/signature/session/*/verify",
                        "/api/signature/session/*/submit",
                        "/api/signature/session/*/status",
                        "/api/signature/session/by-token/**",
                        "/ws/signature/**"
                )
                .order(2);

        log.info("Interceptors registered successfully");
    }

    /**
     * RestTemplate Bean 등록
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
