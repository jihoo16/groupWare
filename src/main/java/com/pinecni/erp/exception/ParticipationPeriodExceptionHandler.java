package com.pinecni.erp.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 참여기간 검증 예외 전용 글로벌 핸들러.
 *
 * - 모든 컨트롤러보다 먼저 잡히도록 HIGHEST_PRECEDENCE 부여
 *   (기존 컨트롤러들의 catch (Exception e) 자체 핸들러를 우회)
 * - JSON 응답으로 error/code/conflicts 모두 포함하여 프론트에 전달
 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class ParticipationPeriodExceptionHandler {

    @ExceptionHandler(ParticipationPeriodException.class)
    public ResponseEntity<Map<String, Object>> handleParticipationPeriod(ParticipationPeriodException ex) {
        log.warn("ParticipationPeriodException - code: {}, message: {}", ex.getCode(), ex.getMessage());

        Map<String, Object> body = new HashMap<>();
        body.put("error", ex.getMessage());
        body.put("code", ex.getCode());
        List<ParticipationConflictDTO> conflicts = ex.getConflicts();
        body.put("conflicts", conflicts != null ? conflicts : List.of());

        // HTTP 409 Conflict — "현재 리소스 상태와 충돌함" 의미가 가장 적합
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }
}
