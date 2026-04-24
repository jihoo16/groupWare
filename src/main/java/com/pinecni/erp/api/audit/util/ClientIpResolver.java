package com.pinecni.erp.api.audit.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 클라이언트 실제 IP 추출 유틸.
 *
 * <p>프록시/로드밸런서(Nginx, AWS ALB 등) 환경에서는 `HttpServletRequest.getRemoteAddr()` 가
 * 프록시 IP를 반환하므로, X-Forwarded-For 등의 헤더를 먼저 확인한다.
 *
 * <p>설계 섹션 11-2 참조.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {}

    private static final String[] IP_HEADERS = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_CLIENT_IP",
            "HTTP_X_FORWARDED_FOR",
            "X-Real-IP"
    };

    /** 요청에서 클라이언트 IP 추출. request가 null 이면 빈 문자열. */
    public static String resolve(HttpServletRequest request) {
        if (request == null) return "";

        for (String header : IP_HEADERS) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For 는 "client, proxy1, proxy2" 형식 가능 — 첫 번째가 원 클라이언트
                int comma = ip.indexOf(',');
                return (comma > -1 ? ip.substring(0, comma) : ip).trim();
            }
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "";
    }

    /** User-Agent 헤더 추출 (nullable) */
    public static String userAgent(HttpServletRequest request) {
        return request == null ? null : request.getHeader("User-Agent");
    }
}
