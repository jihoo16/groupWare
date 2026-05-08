package com.pinecni.erp.api.signature.controller;

import com.pinecni.erp.api.audit.service.AuditLogService;
import com.pinecni.erp.api.signature.dto.DocumentSignatureResponse;
import com.pinecni.erp.api.signature.dto.SignatureSessionCreateRequest;
import com.pinecni.erp.api.signature.dto.SignatureSessionResponse;
import com.pinecni.erp.api.signature.dto.SignatureSubmitRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyResponse;
import com.pinecni.erp.api.signature.service.AutoSignedPdfService;
import com.pinecni.erp.api.signature.service.SignatureService;
import com.pinecni.erp.api.signature.service.SignatureSessionService;
import com.pinecni.erp.constant.CodeConstants.AuditAction;
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
    private final AuditLogService auditLogService;
    private final AutoSignedPdfService autoSignedPdfService;

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

        // 감사 로그: QR 세션 생성
        auditLogService.logSession(userIdx, AuditAction.QR_GENERATE,
                null, request.getDocumentIdx(),
                "QR 세션 생성 (slot=" + request.getSignatureSlot() + ")", httpRequest);

        return ResponseEntity.ok(response);
    }

    /**
     * 외부인 전용 QR 서명 세션 생성 (연구비증빙 문서의 외부 참석자)
     * - PC 사용자는 로그인 필요 (세션 생성자)
     * - 외부인에겐 사번 2차 인증 스킵 (스캔 시 자동 VERIFIED)
     * - 기존 /session 엔드포인트와는 별도 경로로 유지 (권한/로직 분리)
     *
     * 요청 바디: { "documentIdx": 500, "externalPersonIdx": 12 }
     */
    @PostMapping("/external/session")
    public ResponseEntity<SignatureSessionResponse> createExternalSession(
            @RequestBody Map<String, Long> body,
            HttpSession session,
            HttpServletRequest httpRequest) {

        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return ResponseEntity.status(401).build();
        }

        Long documentIdx = body.get("documentIdx");
        Long externalPersonIdx = body.get("externalPersonIdx");
        if (documentIdx == null || externalPersonIdx == null) {
            return ResponseEntity.badRequest().build();
        }

        String ipAddress = resolveClientIp(httpRequest);
        SignatureSessionResponse response = sessionService.createExternalSession(
                documentIdx, externalPersonIdx, userIdx, ipAddress);

        // 감사 로그: 외부인 QR 세션 생성
        auditLogService.logSession(userIdx, AuditAction.QR_GENERATE,
                null, documentIdx,
                "외부인 QR 세션 생성 (externalPersonIdx=" + externalPersonIdx + ")", httpRequest);

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
        // 스캔 자체는 signature_sessions.scanned_ip/agent 에 이미 기록되므로 audit_logs 중복 로그 생략.
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
        // 인증 성공 시 감사 로그(QR_VERIFY)는 서비스 내부에서 기록 — signer_user_idx 접근 가능
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
        // 실제 서명 완료(SIGN + SIGNATURE_SUBMIT) 감사 로그는 서비스 내부에서 signer_user_idx 기반으로 기록
        return ResponseEntity.ok().build();
    }

    /**
     * 세션 취소 (PC 모달 닫기 등 — 로그인 필요)
     */
    @DeleteMapping("/session/{token}")
    public ResponseEntity<Void> cancel(@PathVariable String token, HttpSession session,
                                        HttpServletRequest httpRequest) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return ResponseEntity.status(401).build();
        }
        sessionService.cancelSession(token, userIdx);

        // 감사 로그: 세션 취소
        auditLogService.logSession(userIdx, AuditAction.DELETE, null, null,
                "QR 세션 취소 (token=" + token + ")", httpRequest);

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

    /**
     * 카테고리 B 자동 서명 PDF 상태 조회 (UI 분기용)
     * <ul>
     *   <li>complete=true / hasFinalPdf=true  → 다운로드 버튼 표시</li>
     *   <li>complete=true / hasFinalPdf=false → "PDF 다시 생성하기" 안내 + 재시도 버튼</li>
     *   <li>complete=false                    → 영역 숨김</li>
     * </ul>
     */
    @GetMapping("/document/{documentIdx}/final-pdf-status")
    public ResponseEntity<Map<String, Object>> getFinalPdfStatus(@PathVariable Long documentIdx,
                                                                   HttpSession session) {
        if (session.getAttribute("userIdx") == null) return ResponseEntity.status(401).build();
        boolean complete = signatureService.isAllSignaturesComplete(documentIdx);
        var info = complete ? autoSignedPdfService.findFinalPdfInfo(documentIdx) : null;
        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.put("signatureComplete", complete);
        body.put("hasFinalPdf", info != null);
        if (info != null) {
            body.put("attachmentIdx", info.attachmentIdx());
            body.put("fileName", info.fileName());
            body.put("downloadUrl", info.downloadUrl());
            body.put("createdAt", info.createdAt());
        }
        // 가장 최근 서명 시각 (페이지 로드 시 "방금 서명 완료된 문서인지" 판별용 — 30초 이내면 "생성 중" 추정)
        if (complete) {
            signatureService.getLastSignedAt(documentIdx).ifPresent(ts -> body.put("lastSignedAt", ts));
        }
        return ResponseEntity.ok(body);
    }

    /**
     * 자동 서명 PDF 수동 재생성 (자동 트리거 실패·지연 시 사용자가 직접 재시도).
     * <p>권한: 기안자 또는 관리자 — 단, 본 컨트롤러에선 로그인 + 서명 완료 여부만 검증.
     * 더 정밀한 권한 체크는 추후 추가.</p>
     * <p>동기 호출 — 사용자 화면에서 즉시 결과 확인.</p>
     */
    @PostMapping("/document/{documentIdx}/regenerate-pdf")
    public ResponseEntity<Map<String, Object>> regenerateFinalPdf(@PathVariable Long documentIdx,
                                                                    HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();

        if (!signatureService.isAllSignaturesComplete(documentIdx)) {
            return ResponseEntity.status(409).body(Map.of(
                    "success", false,
                    "message", "전자서명이 모두 완료된 후에 PDF를 생성할 수 있어요."
            ));
        }
        try {
            autoSignedPdfService.generate(documentIdx);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "최종 서명 PDF를 다시 생성했어요."
            ));
        } catch (Exception e) {
            log.error("[자동 PDF] 수동 재생성 실패: documentIdx={}, requester={}, error={}",
                    documentIdx, userIdx, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "PDF 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
            ));
        }
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
     * 내가 요청한 서명 목록 (내가 만든 문서의 서명 현황)
     */
    @GetMapping("/requested-list")
    public ResponseEntity<List<Map<String, Object>>> getRequestedList(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(signatureService.getRequestedListForUser(userIdx));
    }

    /**
     * 미서명자에게 서명요청 알림 (시스템 알림 + 메신저) 다시 보내기.
     * 보낸요청 탭 모달의 미서명 행에서 호출.
     */
    @PostMapping("/{documentSignatureIdx}/resend-request")
    public ResponseEntity<Map<String, Object>> resendSignatureRequest(
            @PathVariable Long documentSignatureIdx, HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) return ResponseEntity.status(401).build();
        signatureService.resendSignatureRequestNotification(documentSignatureIdx, userIdx);
        return ResponseEntity.ok(Map.of("ok", true));
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
