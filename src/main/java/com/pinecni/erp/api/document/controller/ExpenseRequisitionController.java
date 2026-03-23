package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.ExpenseRequisitionCreateDTO;
import com.pinecni.erp.api.document.dto.ExpenseRequisitionDTO;
import com.pinecni.erp.api.document.service.ExpenseRequisitionService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 지출품의서 REST API Controller
 * Base: /api/approval/requisition
 */
@Slf4j
@RestController
@RequestMapping("/api/approval/requisition")
@RequiredArgsConstructor
public class ExpenseRequisitionController {

    private final ExpenseRequisitionService requisitionService;

    /**
     * 지출품의서 생성
     * POST /api/approval/requisition
     */
    @PostMapping
    public ResponseEntity<ExpenseRequisitionDTO> create(
            @RequestBody ExpenseRequisitionCreateDTO dto,
            HttpSession session) {
        log.debug("POST /api/approval/requisition");

        Long userIdx = getLoginUserIdx(session);
        ExpenseRequisitionDTO result = requisitionService.create(dto, userIdx);

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * 지출품의서 단건 조회
     * GET /api/approval/requisition/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ExpenseRequisitionDTO> getOne(
            @PathVariable Long idx,
            HttpSession session) {
        log.debug("GET /api/approval/requisition/{}", idx);

        getLoginUserIdx(session); // 세션 검증
        ExpenseRequisitionDTO result = requisitionService.getOne(idx);

        return ResponseEntity.ok(result);
    }

    /**
     * 지출품의서 목록 조회 (본인 것만)
     * GET /api/approval/requisition
     */
    @GetMapping
    public ResponseEntity<List<ExpenseRequisitionDTO>> getList(HttpSession session) {
        log.debug("GET /api/approval/requisition");

        Long userIdx = getLoginUserIdx(session);
        List<ExpenseRequisitionDTO> result = requisitionService.getList(userIdx);

        return ResponseEntity.ok(result);
    }

    /**
     * 지출품의서 수정
     * PUT /api/approval/requisition/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ExpenseRequisitionDTO> update(
            @PathVariable Long idx,
            @RequestBody ExpenseRequisitionCreateDTO dto,
            HttpSession session) {
        log.debug("PUT /api/approval/requisition/{}", idx);

        Long userIdx = getLoginUserIdx(session);
        ExpenseRequisitionDTO result = requisitionService.update(idx, dto, userIdx);

        return ResponseEntity.ok(result);
    }

    /**
     * 지출품의서 삭제 (soft delete)
     * DELETE /api/approval/requisition/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Void> delete(
            @PathVariable Long idx,
            HttpSession session) {
        log.debug("DELETE /api/approval/requisition/{}", idx);

        Long userIdx = getLoginUserIdx(session);
        requisitionService.delete(idx, userIdx);

        return ResponseEntity.noContent().build();
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private Long getLoginUserIdx(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userIdx;
    }
}
