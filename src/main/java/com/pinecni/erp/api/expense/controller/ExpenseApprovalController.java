package com.pinecni.erp.api.expense.controller;

import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalDTO;
import com.pinecni.erp.api.expense.dto.ExpenseDetailDTO;
import com.pinecni.erp.entity.ExpenseApproval;
import com.pinecni.erp.entity.ExpenseDetail;
import com.pinecni.erp.service.ExpenseApprovalService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 지출승인서 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/approval/expense")
@RequiredArgsConstructor
public class ExpenseApprovalController {

    private final ExpenseApprovalService expenseApprovalService;

    /**
     * 지출승인서 생성
     * POST /api/approval/expense
     */
    @PostMapping
    public ResponseEntity<ExpenseApprovalDTO> createExpenseApproval(
            @Valid @RequestBody ExpenseApprovalCreateDTO createDTO,
            HttpSession session) {
        log.debug("POST /api/approval/expense");

        Long loginUserIdx = getLoginUserIdx(session);
        createDTO.setUserIdx(loginUserIdx);

        ExpenseApproval created = expenseApprovalService.createExpenseApproval(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToDTO(created));
    }

    /**
     * 지출승인서 목록 조회 (본인 것만)
     * GET /api/approval/expense
     */
    @GetMapping
    public ResponseEntity<List<ExpenseApprovalDTO>> getMyExpenseApprovals(HttpSession session) {
        log.debug("GET /api/approval/expense");

        Long loginUserIdx = getLoginUserIdx(session);
        List<ExpenseApproval> list = expenseApprovalService.getExpenseApprovalsByUser(loginUserIdx);
        List<ExpenseApprovalDTO> result = list.stream().map(this::mapToDTO).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * 지출승인서 상세 조회
     * GET /api/approval/expense/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ExpenseApprovalDTO> getExpenseApproval(
            @PathVariable Long idx,
            HttpSession session) {
        log.debug("GET /api/approval/expense/{}", idx);

        Long loginUserIdx = getLoginUserIdx(session);
        ExpenseApproval expenseApproval = expenseApprovalService.getExpenseApprovalWithDetails(idx);

        // 본인 문서 또는 관리자만 조회 가능 (현재는 본인만)
        if (!expenseApproval.getUserIdx().equals(loginUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 조회할 수 있습니다.");
        }

        return ResponseEntity.ok(mapToDTO(expenseApproval));
    }

    /**
     * 지출승인서 수정
     * PUT /api/approval/expense/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ExpenseApprovalDTO> updateExpenseApproval(
            @PathVariable Long idx,
            @Valid @RequestBody ExpenseApprovalCreateDTO updateDTO,
            HttpSession session) {
        log.debug("PUT /api/approval/expense/{}", idx);

        Long loginUserIdx = getLoginUserIdx(session);
        ExpenseApproval updated = expenseApprovalService.updateExpenseApproval(idx, updateDTO, loginUserIdx);

        return ResponseEntity.ok(mapToDTO(updated));
    }

    /**
     * 지출승인서 삭제 (soft delete)
     * DELETE /api/approval/expense/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Void> deleteExpenseApproval(
            @PathVariable Long idx,
            HttpSession session) {
        log.debug("DELETE /api/approval/expense/{}", idx);

        Long loginUserIdx = getLoginUserIdx(session);
        expenseApprovalService.deleteExpenseApproval(idx, loginUserIdx);

        return ResponseEntity.noContent().build();
    }

    // ── private helpers ────────────────────────────────────────────────────

    private Long getLoginUserIdx(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userIdx;
    }

    private ExpenseApprovalDTO mapToDTO(ExpenseApproval entity) {
        List<ExpenseDetailDTO> detailDTOs = entity.getExpenseDetails() != null
                ? entity.getExpenseDetails().stream()
                        .map(this::mapDetailToDTO)
                        .collect(Collectors.toList())
                : List.of();

        return ExpenseApprovalDTO.builder()
                .idx(entity.getIdx())
                .userIdx(entity.getUserIdx())
                .totalAmount(entity.getTotalAmount())
                .documentIdx(entity.getDocumentIdx())
                .documentNumber(entity.getDocumentNumber())
                .expenseDetails(detailDTOs)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .deleted(entity.getDeleted())
                .deletedAt(entity.getDeletedAt())
                .deletedUserIdx(entity.getDeletedUserIdx())
                .build();
    }

    private ExpenseDetailDTO mapDetailToDTO(ExpenseDetail entity) {
        return ExpenseDetailDTO.builder()
                .expenseDate(entity.getExpenseDate())
                .description(entity.getDescription())
                .shopName(entity.getShopName())
                .paymentMethod(entity.getPaymentMethod())
                .amount(entity.getAmount())
                .note(entity.getNote())
                .build();
    }
}
