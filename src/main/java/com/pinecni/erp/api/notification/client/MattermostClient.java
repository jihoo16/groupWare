package com.pinecni.erp.api.notification.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Mattermost REST API 클라이언트 (최소 슬라이스 — 봇 연결 테스트용).
 *
 * <p>현재 슬라이스에서는 토큰 유효성 + 채널 접근 권한 검증만 지원.
 * Phase 3 의 dispatcher 가 들어오면 {@code postMessage}, {@code createDirectChannel} 등이 추가된다.
 *
 * <p>호출은 동기 RestClient 사용. 타임아웃은 connect 5s / read 10s.
 */
@Slf4j
@Component
public class MattermostClient {

    /** 연결 타임아웃 — 사내 MM 서버라 충분 */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    /** 응답 타임아웃 — getMe/getChannel 둘 다 가벼운 호출 */
    private static final Duration READ_TIMEOUT    = Duration.ofSeconds(10);

    private final RestClient restClient = buildClient();

    private static RestClient buildClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) CONNECT_TIMEOUT.toMillis());
        factory.setReadTimeout((int) READ_TIMEOUT.toMillis());
        return RestClient.builder()
                .requestFactory((ClientHttpRequestFactory) factory)
                .build();
    }

    /**
     * 봇 자기 자신 정보 조회 — 토큰 인증 + 봇 식별자 확보용.
     *
     * <p>{@code GET {serverUrl}/api/v4/users/me}
     */
    public MmUser getMe(String serverUrl, String plainToken) {
        String url = trimTrailingSlash(serverUrl) + "/api/v4/users/me";
        log.debug("[MM] GET {}", url);
        return call(() -> restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + plainToken)
                .retrieve()
                .body(MmUser.class));
    }

    /**
     * 채널 정보 조회 — 봇이 그 채널에 접근 권한이 있는지 검증.
     *
     * <p>{@code GET {serverUrl}/api/v4/channels/{channelId}}
     */
    public MmChannel getChannel(String serverUrl, String plainToken, String channelId) {
        String url = trimTrailingSlash(serverUrl) + "/api/v4/channels/" + channelId;
        return call(() -> restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + plainToken)
                .retrieve()
                .body(MmChannel.class));
    }

    /**
     * 사번(=MM username) 으로 MM 사용자 조회.
     *
     * <p>{@code GET {serverUrl}/api/v4/users/username/{username}}
     */
    public MmUser getUserByUsername(String serverUrl, String plainToken, String username) {
        String url = trimTrailingSlash(serverUrl) + "/api/v4/users/username/" + username;
        return call(() -> restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + plainToken)
                .retrieve()
                .body(MmUser.class));
    }

    /**
     * 봇과 사용자의 1:1 DM 채널 생성/조회 (이미 있으면 그걸 반환).
     *
     * <p>{@code POST {serverUrl}/api/v4/channels/direct}
     * <p>Body: {@code [botUserId, recipientUserId]}
     */
    public MmChannel createDirectChannel(String serverUrl, String plainToken,
                                         String botUserId, String recipientUserId) {
        String url = trimTrailingSlash(serverUrl) + "/api/v4/channels/direct";
        String[] body = { botUserId, recipientUserId };
        return call(() -> restClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + plainToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(MmChannel.class));
    }

    /**
     * 메시지 발송. message 는 Mattermost Markdown 지원.
     *
     * <p>{@code POST {serverUrl}/api/v4/posts}
     * <p>Body: {@code { "channel_id": "...", "message": "..." }}
     */
    public MmPost postMessage(String serverUrl, String plainToken,
                              String channelId, String message) {
        String url = trimTrailingSlash(serverUrl) + "/api/v4/posts";
        java.util.Map<String, String> body = java.util.Map.of(
                "channel_id", channelId,
                "message", message);
        return call(() -> restClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + plainToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(MmPost.class));
    }

    // =========================================================================
    // 헬퍼 / 예외 매핑
    // =========================================================================

    private <T> T call(java.util.function.Supplier<T> action) {
        try {
            return action.get();
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new MattermostApiException(MattermostErrorKind.UNAUTHORIZED, e.getStatusCode().value(), e);
        } catch (HttpClientErrorException.Forbidden e) {
            throw new MattermostApiException(MattermostErrorKind.FORBIDDEN, e.getStatusCode().value(), e);
        } catch (HttpClientErrorException.NotFound e) {
            throw new MattermostApiException(MattermostErrorKind.NOT_FOUND, e.getStatusCode().value(), e);
        } catch (HttpClientErrorException e) {
            throw new MattermostApiException(MattermostErrorKind.CLIENT_ERROR, e.getStatusCode().value(), e);
        } catch (HttpServerErrorException e) {
            throw new MattermostApiException(MattermostErrorKind.SERVER_ERROR, e.getStatusCode().value(), e);
        } catch (ResourceAccessException e) {
            // ConnectException, SocketTimeoutException, UnknownHostException 등
            MattermostErrorKind kind = e.getCause() instanceof java.net.SocketTimeoutException
                    ? MattermostErrorKind.TIMEOUT
                    : MattermostErrorKind.UNREACHABLE;
            throw new MattermostApiException(kind, 0, e);
        } catch (Exception e) {
            throw new MattermostApiException(MattermostErrorKind.UNKNOWN, 0, e);
        }
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) return "";
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    // =========================================================================
    // DTO (Mattermost 응답 부분 매핑 — 우리가 쓰는 필드만)
    // =========================================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MmUser(String id, String username) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MmChannel(String id, String name, String display_name, String team_id) { }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MmPost(String id, String channel_id, String message, Long create_at) { }

    public enum MattermostErrorKind {
        /** 401 — 토큰 잘못됨 */
        UNAUTHORIZED,
        /** 403 — 권한 없음 (봇이 채널 멤버 아님 등) */
        FORBIDDEN,
        /** 404 — 리소스 없음 (채널 ID 잘못됨) */
        NOT_FOUND,
        /** 4xx (위 외) */
        CLIENT_ERROR,
        /** 5xx — MM 서버 자체 오류 */
        SERVER_ERROR,
        /** 응답 시간 초과 */
        TIMEOUT,
        /** 연결 자체가 안 됨 (서버 URL 잘못, 네트워크 단절) */
        UNREACHABLE,
        /** 위에 매핑되지 않은 예외 */
        UNKNOWN;
    }

    public static class MattermostApiException extends RuntimeException {
        private final MattermostErrorKind kind;
        private final int statusCode;

        public MattermostApiException(MattermostErrorKind kind, int statusCode, Throwable cause) {
            super(kind.name() + " (" + statusCode + ")", cause);
            this.kind = kind;
            this.statusCode = statusCode;
        }

        public MattermostErrorKind getKind() { return kind; }
        public int getStatusCode() { return statusCode; }
    }
}
