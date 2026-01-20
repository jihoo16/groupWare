package com.pinecni.erp.exception;

/**
 * 권한 없는 접근 시 발생하는 예외
 * - 404 페이지로 리다이렉트하기 위해 사용
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException() {
        super("이 페이지에 접근할 권한이 없습니다.");
    }

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}
