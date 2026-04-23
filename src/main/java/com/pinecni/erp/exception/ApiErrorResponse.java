package com.pinecni.erp.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * API 에러 응답 공통 헬퍼
 * - Controller에서 예외를 catch한 뒤 프론트에 내려보낼 응답을 만들 때 사용
 * - 내부 식별자(ID, 경로, 스택, 기술용어)를 노출하지 않도록 메시지를 정제
 *
 * 사용 예:
 *   return ResponseEntity.badRequest().body(ApiErrorResponse.of(e));
 *   return ResponseEntity.badRequest().body(ApiErrorResponse.of("요청하신 문서를 찾을 수 없습니다."));
 *   return ResponseEntity.internalServerError().body(ApiErrorResponse.serverError());
 *
 * 주의: 상세 원인은 항상 서버 로그(SLF4J)에 별도로 남긴다. 이 헬퍼는 메시지만 담당.
 */
public final class ApiErrorResponse {

    private ApiErrorResponse() {
    }

    /** 서버 내부 오류 시 공통 안내 문구 */
    public static final String GENERIC_SERVER_ERROR =
            "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    /** 파라미터/조회 실패 시 공통 안내 문구 */
    public static final String GENERIC_BAD_REQUEST =
            "요청을 처리할 수 없습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";

    // 내부 식별자 패턴 (idx/id 다음 숫자 등)
    private static final Pattern INTERNAL_ID_PATTERN =
            Pattern.compile("([a-zA-Z_]*(?:[Ii]dx|ID|Id)\\s*[:=]?\\s*)\\d+");
    // 절대경로 패턴 (윈도우/유닉스)
    private static final Pattern ABSOLUTE_PATH_PATTERN =
            Pattern.compile("(?:[A-Za-z]:\\\\|/)[^\\s,]+");
    // 클래스 FQN/스택 흔적 (com.pinecni..., java.lang...)
    private static final Pattern FQN_PATTERN =
            Pattern.compile("\\b(?:com|org|java|jakarta|sun)\\.[A-Za-z0-9_.$]+");
    // 기술용어 (예외 타입명 등)
    private static final Pattern TECHNICAL_TOKEN_PATTERN =
            Pattern.compile("\\b(?:IllegalArgument|IllegalState|NullPointer|Runtime|IOException|SQLException)\\w*");

    /**
     * 사용자 친화적 메시지를 담은 응답 바디 생성
     */
    public static Map<String, Object> of(String userMessage) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("message", userMessage != null && !userMessage.isBlank()
                ? userMessage
                : GENERIC_SERVER_ERROR);
        // 하위 호환: 기존 프론트가 error 키를 읽는 경우도 있으므로 동일 값 중복 세팅
        body.put("error", body.get("message"));
        return body;
    }

    /**
     * 예외를 받아 사용자 친화적 메시지로 정제한 응답 바디 생성
     * - IllegalArgumentException / IllegalStateException (비즈니스 검증)만 메시지 노출
     * - 그 외는 서버 내부 오류 문구로 치환
     */
    public static Map<String, Object> of(Throwable throwable) {
        if (throwable == null) {
            return of(GENERIC_SERVER_ERROR);
        }
        if (throwable instanceof IllegalArgumentException
                || throwable instanceof IllegalStateException) {
            return of(sanitize(throwable.getMessage()));
        }
        return of(GENERIC_SERVER_ERROR);
    }

    /**
     * 서버 내부 오류 응답
     */
    public static Map<String, Object> serverError() {
        return of(GENERIC_SERVER_ERROR);
    }

    /**
     * 메시지에서 내부 식별자/경로/기술용어를 제거
     * 남길 것: 사용자에게 읽혀도 무해한 한글 문장
     * 제거할 것: ", idx: 123", 절대경로, "IllegalArgumentException" 등
     */
    static String sanitize(String raw) {
        if (raw == null || raw.isBlank()) {
            return GENERIC_BAD_REQUEST;
        }
        String cleaned = raw;

        // "~, documentIdx: 123" 또는 "~. idx=456" 꼬리표 제거
        cleaned = INTERNAL_ID_PATTERN.matcher(cleaned).replaceAll("");
        // 절대경로 제거
        cleaned = ABSOLUTE_PATH_PATTERN.matcher(cleaned).replaceAll("");
        // 클래스 FQN 제거
        cleaned = FQN_PATTERN.matcher(cleaned).replaceAll("");
        // 예외 타입명 제거
        cleaned = TECHNICAL_TOKEN_PATTERN.matcher(cleaned).replaceAll("");

        // 남은 구두점/공백 정리
        cleaned = cleaned.replaceAll("[:=]\\s*$", "")
                .replaceAll("[,;]\\s*$", "")
                .replaceAll("\\s{2,}", " ")
                .trim();

        // 꼬리의 "- " 같은 잔재 제거
        cleaned = cleaned.replaceAll("[\\-,:;]\\s*$", "").trim();

        if (cleaned.isEmpty()) {
            return GENERIC_BAD_REQUEST;
        }
        return cleaned;
    }
}
