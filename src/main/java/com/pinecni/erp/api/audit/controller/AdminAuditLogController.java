package com.pinecni.erp.api.audit.controller;

import com.pinecni.erp.api.audit.dto.AuditLogDTO;
import com.pinecni.erp.api.audit.dto.AuditLogPageResponse;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.AuditLog;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.PrintWriter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 관리자 감사 로그 REST API
 *
 * <p>설계 섹션 11-4 참조.
 *
 * <p>권한: C1101(DEVELOPER), C1102(ADMIN), C1105(EXECUTIVE) 열람 가능.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditLogController {

    private static final Set<String> ALLOWED_ROLES = Set.of("C1101", "C1102", "C1105");
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_EXPORT_ROWS = 10_000;

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;

    /**
     * 감사 로그 검색 (페이징)
     *
     * GET /api/admin/audit-logs
     *   ?userIdx=&targetType=&action=&documentIdx=&start=YYYY-MM-DD&end=YYYY-MM-DD
     *   &page=0&size=20
     */
    @GetMapping
    public ResponseEntity<AuditLogPageResponse> search(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long documentIdx,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpSession session) {

        assertPermission(session);

        LocalDateTime startDt = parseStartDate(start);
        LocalDateTime endDt = parseEndDate(end);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100));

        Page<AuditLog> result = auditLogRepository.search(
                userIdx,
                emptyToNull(targetType),
                emptyToNull(action),
                documentIdx,
                startDt, endDt,
                pageable);

        List<AuditLogDTO> content = enrich(result.getContent());

        return ResponseEntity.ok(AuditLogPageResponse.builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build());
    }

    /**
     * 단건 상세 (detail_json 포함 가독성)
     */
    @GetMapping("/{idx}")
    public ResponseEntity<AuditLogDTO> detail(@org.springframework.web.bind.annotation.PathVariable Long idx,
                                              HttpSession session) {
        assertPermission(session);
        AuditLog entity = auditLogRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "감사 로그를 찾을 수 없습니다."));
        return ResponseEntity.ok(enrich(List.of(entity)).get(0));
    }

    /**
     * CSV 다운로드 (검색 조건 동일, 최대 {@value #MAX_EXPORT_ROWS} 건)
     */
    @GetMapping(value = "/export", produces = "text/csv; charset=UTF-8")
    public void exportCsv(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long documentIdx,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            HttpSession session,
            HttpServletResponse response) throws java.io.IOException {

        assertPermission(session);

        LocalDateTime startDt = parseStartDate(start);
        LocalDateTime endDt = parseEndDate(end);
        Pageable pageable = PageRequest.of(0, MAX_EXPORT_ROWS);
        Page<AuditLog> page = auditLogRepository.search(
                userIdx, emptyToNull(targetType), emptyToNull(action), documentIdx, startDt, endDt, pageable);

        List<AuditLogDTO> rows = enrich(page.getContent());

        String filename = "audit-logs_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".csv";
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename*=UTF-8''" + URLEncoder.encode(filename, StandardCharsets.UTF_8));

        try (PrintWriter out = response.getWriter()) {
            // UTF-8 BOM (엑셀 호환)
            out.write('﻿');
            out.println("시각,행위자(사번),행위자(이름),부서,대상유형,행위,문서IDX,대상IDX,설명,IP,URL,Method");
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (AuditLogDTO r : rows) {
                out.println(String.join(",",
                        csv(r.getCreatedAt() == null ? "" : r.getCreatedAt().format(fmt)),
                        csv(r.getUserEmpId()),
                        csv(r.getUserName()),
                        csv(r.getUserDeptName()),
                        csv(r.getTargetTypeName()),
                        csv(r.getActionName()),
                        csv(r.getDocumentIdx() == null ? "" : r.getDocumentIdx().toString()),
                        csv(r.getTargetIdx() == null ? "" : r.getTargetIdx().toString()),
                        csv(r.getDescription()),
                        csv(r.getIpAddress()),
                        csv(r.getRequestUrl()),
                        csv(r.getRequestMethod())
                ));
            }
        }
    }

    // =========================================================================
    // 헬퍼
    // =========================================================================

    private void assertPermission(HttpSession session) {
        String role = (String) session.getAttribute("userRoleCode");
        if (role == null || !ALLOWED_ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "감사 로그 열람 권한이 없습니다.");
        }
    }

    private LocalDateTime parseStartDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s).atStartOfDay(); }
        catch (Exception e) { return null; }
    }

    private LocalDateTime parseEndDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s).plusDays(1).atStartOfDay(); } // 종료일 포함(exclusive next day)
        catch (Exception e) { return null; }
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    /**
     * users 일괄 JOIN + code_name 매핑해서 DTO 변환.
     * N+1 피하려고 userIdx 들 한꺼번에 findAllById.
     */
    private List<AuditLogDTO> enrich(List<AuditLog> entities) {
        if (entities.isEmpty()) return Collections.emptyList();

        // userIdx 일괄 조회
        List<Long> userIdxs = entities.stream().map(AuditLog::getUserIdx).distinct().toList();
        Map<Long, User> userMap = new HashMap<>();
        userRepository.findAllById(userIdxs).forEach(u -> userMap.put(u.getIdx(), u));

        // 부서·C17·C18 code_name 캐싱
        Map<String, String> deptNameCache = new HashMap<>();
        Map<String, String> targetNameCache = new HashMap<>();
        Map<String, String> actionNameCache = new HashMap<>();

        List<AuditLogDTO> out = new ArrayList<>(entities.size());
        for (AuditLog e : entities) {
            User u = userMap.get(e.getUserIdx());
            String deptName = null;
            if (u != null && u.getEmpDept() != null) {
                deptName = deptNameCache.computeIfAbsent(u.getEmpDept(), dept ->
                        codeRepository.findByGroupCodeAndCode(
                                        CodeConstants.GroupCode.DEPARTMENT.getCode(), dept)
                                .map(Code::getCodeName).orElse(null));
            }
            String targetTypeName = targetNameCache.computeIfAbsent(e.getTargetType(), tt ->
                    codeRepository.findByGroupCodeAndCode(
                                    CodeConstants.GroupCode.AUDIT_TARGET_TYPE.getCode(), tt)
                            .map(Code::getCodeName).orElse(tt));
            String actionName = actionNameCache.computeIfAbsent(e.getAction(), ac ->
                    codeRepository.findByGroupCodeAndCode(
                                    CodeConstants.GroupCode.AUDIT_ACTION.getCode(), ac)
                            .map(Code::getCodeName).orElse(ac));

            out.add(AuditLogDTO.builder()
                    .idx(e.getIdx())
                    .createdAt(e.getCreatedAt())
                    .userIdx(e.getUserIdx())
                    .userEmpId(u != null ? u.getEmpId() : null)
                    .userName(u != null ? u.getEmpName() : null)
                    .userDeptName(deptName)
                    .targetType(e.getTargetType())
                    .targetTypeName(targetTypeName)
                    .targetIdx(e.getTargetIdx())
                    .action(e.getAction())
                    .actionName(actionName)
                    .documentIdx(e.getDocumentIdx())
                    .description(e.getDescription())
                    .detailJson(e.getDetailJson())
                    .ipAddress(e.getIpAddress())
                    .userAgent(e.getUserAgent())
                    .requestUrl(e.getRequestUrl())
                    .requestMethod(e.getRequestMethod())
                    .build());
        }
        return out;
    }

    /** CSV 필드 이스케이프 (쉼표/따옴표/개행 포함 시 "..." 감쌈) */
    private String csv(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
