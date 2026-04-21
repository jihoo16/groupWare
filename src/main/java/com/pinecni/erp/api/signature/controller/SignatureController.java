package com.pinecni.erp.api.signature.controller;

import com.pinecni.erp.api.signature.dto.DocumentSignatureResponse;
import com.pinecni.erp.api.signature.dto.SignatureSessionCreateRequest;
import com.pinecni.erp.api.signature.dto.SignatureSessionResponse;
import com.pinecni.erp.api.signature.dto.SignatureSubmitRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyResponse;
import com.pinecni.erp.api.signature.service.SignatureService;
import com.pinecni.erp.api.signature.service.SignatureSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 전자서명 REST API
 *
 * <p>엔드포인트 구분:
 * <ul>
 *   <li>/api/signature/session/** - QR 서명 세션 (일부는 토큰 기반, 세션 인증 예외)</li>
 *   <li>/api/signature/document/** - 문서 서명 현황 조회 (로그인 필요)</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/signature")
@RequiredArgsConstructor
public class SignatureController {

    private final SignatureSessionService sessionService;
    private final SignatureService signatureService;

    // ============================================================
    // 서명 세션 (QR 플로우)
    // ============================================================

    /**
     * QR 서명 세션 생성 (PC에서 서명칸 클릭)
     * - 로그인 필요
     */
    @PostMapping("/session")
    public ResponseEntity<SignatureSessionResponse> createSession(
            @Valid @RequestBody SignatureSessionCreateRequest request,
            HttpSession session,
            HttpServletRequest httpRequest) {

        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return ResponseEntity.status(401).build();
        }

        String ipAddress = resolveClientIp(httpRequest);
        SignatureSessionResponse response = sessionService.createSession(request, userIdx, ipAddress);
        return ResponseEntity.ok(response);
    }

    /**
     * 토큰으로 세션 정보 조회 (모바일 서명 페이지 진입 시 — 세션 인증 불필요)
     */
    @GetMapping("/session/by-token/{token}")
    public ResponseEntity<SignatureSessionResponse> getSessionByToken(@PathVariable String token) {
        return ResponseEntity.ok(sessionService.getSessionByToken(token));
    }

    /**
     * 세션 상태 폴링 (PC fallback — WebSocket 실패 대비, 세션 인증 불필요)
     */
    @GetMapping("/session/{token}/status")
    public ResponseEntity<SignatureSessionResponse> getStatus(@PathVariable String token) {
        return ResponseEntity.ok(sessionService.getSessionByToken(token));
    }

    /**
     * 모바일 QR 스캔 확인 (세션 인증 불필요)
     */
    @PostMapping("/session/{token}/scan")
    public ResponseEntity<SignatureSessionResponse> scan(@PathVariable String token,
                                                          HttpServletRequest httpRequest) {
        String ipAddress = resolveClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(sessionService.scanSession(token, ipAddress, userAgent));
    }

    /**
     * 사번 2차 인증 (세션 인증 불필요)
     */
    @PostMapping("/session/{token}/verify")
    public ResponseEntity<SignatureVerifyResponse> verify(@PathVariable String token,
                                                           @Valid @RequestBody SignatureVerifyRequest request,
                                                           HttpServletRequest httpRequest) {
        String ipAddress = resolveClientIp(httpRequest);
        return ResponseEntity.ok(sessionService.verifySession(token, request, ipAddress));
    }

    /**
     * 서명 이미지 제출 (세션 인증 불필요)
     */
    @PostMapping("/session/{token}/submit")
    public ResponseEntity<Void> submit(@PathVariable String token,
                                        @Valid @RequestBody SignatureSubmitRequest request,
                                        HttpServletRequest httpRequest) {
        String ipAddress = resolveClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        sessionService.submitSignature(token, request, ipAddress, userAgent);
        return ResponseEntity.ok().build();
    }

    /**
     * 세션 취소 (PC 모달 닫기 등 — 로그인 필요)
     */
    @DeleteMapping("/session/{token}")
    public ResponseEntity<Void> cancel(@PathVariable String token, HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return ResponseEntity.status(401).build();
        }
        sessionService.cancelSession(token, userIdx);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // 문서 서명 현황 조회 (로그인 필요)
    // ============================================================

    /**
     * 문서의 서명 현황 조회 (문서 상세 페이지 로딩 시)
     */
    @GetMapping("/document/{documentIdx}")
    public ResponseEntity<List<DocumentSignatureResponse>> getDocumentSignatures(
            @PathVariable Long documentIdx, HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(signatureService.getDocumentSignatures(documentIdx, userIdx));
    }

    /**
     * 문서의 전자서명 완료 여부 조회 (제출 게이트 검증용 — 프론트 미리보기)
     */
    @GetMapping("/document/{documentIdx}/complete")
    public ResponseEntity<Map<String, Boolean>> isComplete(@PathVariable Long documentIdx) {
        boolean complete = signatureService.isAllSignaturesComplete(documentIdx);
        return ResponseEntity.ok(Map.of("complete", complete));
    }

    // ============================================================
    // 홈 대시보드 위젯용 (로그인 필요)
    // ============================================================

    /**
     * 본인 서명 대기 건수 조회 (홈 위젯 배지용)
     */
    @GetMapping("/pending-count")
    public ResponseEntity<Map<String, Long>> getPendingCount(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();
        long count = signatureService.countPendingForUser(userIdx);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * 본인 서명 대기 목록 조회
     */
    @GetMapping("/pending-list")
    public ResponseEntity<List<Map<String, Object>>> getPendingList(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(signatureService.getPendingListForUser(userIdx));
    }

    /**
     * 본인 서명 완료 이력 조회
     */
    @GetMapping("/completed-list")
    public ResponseEntity<List<Map<String, Object>>> getCompletedList(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(signatureService.getCompletedListForUser(userIdx));
    }

    /**
     * 일괄 서명 적용 (첫 번째 서명 이미지를 나머지에 적용)
     */
    @PostMapping("/bulk-apply")
    public ResponseEntity<Map<String, Object>> bulkApply(
            @RequestBody Map<String, Object> body, HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();

        @SuppressWarnings("unchecked")
        List<Number> idxList = (List<Number>) body.get("documentSignatureIdxList");
        String imageBase64 = (String) body.get("signatureImageBase64");

        if (idxList == null || idxList.isEmpty() || imageBase64 == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "필수 파라미터 누락"));
        }

        List<Long> targetIdxList = idxList.stream().map(Number::longValue).toList();
        int applied = signatureService.bulkApplySignature(userIdx, targetIdxList, imageBase64);

        return ResponseEntity.ok(Map.of("applied", applied, "total", targetIdxList.size()));
    }

    // ============================================================
    // 예외 핸들러 — 비즈니스 예외를 400으로 변환
    // ============================================================

    @ExceptionHandler({IllegalStateException.class, IllegalArgumentException.class})
    public ResponseEntity<Map<String, String>> handleBusinessException(RuntimeException ex) {
        log.warn("[서명 비즈니스 예외] {}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    // ============================================================
    // 헬퍼
    // ============================================================

    /**
     * 클라이언트 IP 조회 (X-Forwarded-For 우선 고려)
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // 첫 번째 IP가 실제 클라이언트
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
