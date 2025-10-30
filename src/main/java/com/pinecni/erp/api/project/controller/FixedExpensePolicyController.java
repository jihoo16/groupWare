package com.pinecni.erp.api.project.controller;

import com.pinecni.erp.api.project.dto.FixedExpensePolicyDTO;
import com.pinecni.erp.api.project.dto.FixedExpensePolicyUpdateDTO;
import com.pinecni.erp.api.project.service.FixedExpensePolicyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 직급별 고정경비 정책 Controller
 * REST API 엔드포인트
 */
@Slf4j
@RestController
@RequestMapping("/api/fixed-expense-policies")
@RequiredArgsConstructor
public class FixedExpensePolicyController {

    private final FixedExpensePolicyService fixedExpensePolicyService;

    /**
     * 전체 고정경비 정책 목록 조회
     * GET /api/fixed-expense-policies
     */
    @GetMapping
    public ResponseEntity<List<FixedExpensePolicyDTO>> getAllPolicies() {
        log.debug("GET /api/fixed-expense-policies - getAllPolicies()");
        List<FixedExpensePolicyDTO> policies = fixedExpensePolicyService.getAllPolicies();
        return ResponseEntity.ok(policies);
    }

    /**
     * 직급별 고정경비 정책 조회
     * GET /api/fixed-expense-policies/{positionCode}
     */
    @GetMapping("/{positionCode}")
    public ResponseEntity<FixedExpensePolicyDTO> getPolicyByPositionCode(@PathVariable String positionCode) {
        log.debug("GET /api/fixed-expense-policies/{} - getPolicyByPositionCode()", positionCode);

        FixedExpensePolicyDTO policy = fixedExpensePolicyService.getPolicyByPositionCode(positionCode);

        if (policy == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(policy);
    }

    /**
     * 고정경비 정책 생성 또는 수정 (단일)
     * POST /api/fixed-expense-policies
     */
    @PostMapping
    public ResponseEntity<FixedExpensePolicyDTO> upsertPolicy(
            @RequestBody FixedExpensePolicyUpdateDTO updateDTO) {
        log.debug("POST /api/fixed-expense-policies - upsertPolicy() with positionCode: {}", updateDTO.getPositionCode());

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

        try {
            FixedExpensePolicyDTO policy = fixedExpensePolicyService.upsertPolicy(updateDTO, currentUserIdx);
            return ResponseEntity.ok(policy);
        } catch (IllegalArgumentException e) {
            log.error("고정경비 정책 저장 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 고정경비 정책 일괄 저장
     * POST /api/fixed-expense-policies/batch
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> upsertPoliciesBatch(
            @RequestBody List<FixedExpensePolicyUpdateDTO> updateDTOs) {
        log.debug("POST /api/fixed-expense-policies/batch - upsertPoliciesBatch() with {} policies", updateDTOs.size());

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

        try {
            List<FixedExpensePolicyDTO> policies = fixedExpensePolicyService.upsertPolicies(updateDTOs, currentUserIdx);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "고정경비 정책이 성공적으로 저장되었습니다.");
            response.put("count", policies.size());
            response.put("policies", policies);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("고정경비 정책 일괄 저장 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 고정경비 정책 삭제
     * DELETE /api/fixed-expense-policies/{positionCode}
     */
    @DeleteMapping("/{positionCode}")
    public ResponseEntity<Map<String, String>> deletePolicy(@PathVariable String positionCode) {
        log.debug("DELETE /api/fixed-expense-policies/{} - deletePolicy()", positionCode);

        try {
            fixedExpensePolicyService.deletePolicy(positionCode);

            Map<String, String> response = new HashMap<>();
            response.put("message", "고정경비 정책이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("고정경비 정책 삭제 실패: {}", e.getMessage());

            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * Exception Handler
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error occurred", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
