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
                        "/api/users",       // 사용자 목록 API (개발용)
                        "/css/**",          // CSS 정적 리소스
                        "/js/**",           // JavaScript 정적 리소스
                        "/images/**",       // 이미지 정적 리소스
                        "/favicon.ico",     // 파비콘
                        "/favicon.svg",     // 파비콘 SVG
                        "/error"            // 에러 페이지
                )
                .order(1);

        // 2. 최초 로그인 인터셉터 (비밀번호 변경 강제)
        registry.addInterceptor(firstLoginInterceptor)
                .addPathPatterns("/**")  // 모든 경로에 적용
                .excludePathPatterns(
                        "/login",           // 로그인 페이지
                        "/change-password", // 비밀번호 변경 페이지
                        "/api/auth/**",     // 인증 API (로그인, 비밀번호 변경 등)
                        "/api/health",      // Health check API
                        "/css/**",          // CSS 정적 리소스
                        "/js/**",           // JavaScript 정적 리소스
                        "/images/**",       // 이미지 정적 리소스
                        "/fonts/**",        // 폰트 정적 리소스
                        "/favicon.ico",     // 파비콘
                        "/favicon.svg",     // 파비콘 SVG
                        "/error"            // 에러 페이지
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
