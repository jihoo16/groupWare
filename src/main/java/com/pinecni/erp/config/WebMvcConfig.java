package com.pinecni.erp.config;

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

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        log.info("Registering authentication interceptor");

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
                        "/error"            // 에러 페이지
                );

        log.info("Authentication interceptor registered successfully");
    }

    /**
     * RestTemplate Bean 등록
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
