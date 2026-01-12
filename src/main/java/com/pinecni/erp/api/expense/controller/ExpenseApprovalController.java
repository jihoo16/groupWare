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

        // 세션에서 로그인한 사용자 IDX 가져오기
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            // DTO에 userIdx가 있으면 사용, 없으면 기본값
            userIdx = createDTO.getUserIdx() != null ? createDTO.getUserIdx() : 1L;
        }

        // DTO에 userIdx 설정
        createDTO.setUserIdx(userIdx);

        log.debug("Creating expense approval for userIdx: {}", userIdx);

        // 서비스 호출
        ExpenseApproval created = expenseApprovalService.createExpenseApproval(createDTO);

        // Entity를 DTO로 변환
        ExpenseApprovalDTO responseDTO = mapToDTO(created);

        log.debug("Expense approval created successfully - IDX: {}", created.getIdx());

        return ResponseEntity.status(HttpStatus.CREATED).body(responseDTO);
    }

    /**
     * 지출승인서 상세 조회
     * GET /api/approval/expense/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ExpenseApprovalDTO> getExpenseApproval(@PathVariable Long idx) {
        log.debug("GET /api/approval/expense/{}", idx);

        ExpenseApproval expenseApproval = expenseApprovalService.getExpenseApprovalWithDetails(idx);
        ExpenseApprovalDTO responseDTO = mapToDTO(expenseApproval);

        return ResponseEntity.ok(responseDTO);
    }

    /**
     * 사용자별 지출승인서 목록 조회
     * GET /api/approval/expense/user/{userIdx}
     */
    @GetMapping("/user/{userIdx}")
    public ResponseEntity<List<ExpenseApprovalDTO>> getExpenseApprovalsByUser(@PathVariable Long userIdx) {
        log.debug("GET /api/approval/expense/user/{}", userIdx);

        List<ExpenseApproval> expenseApprovals = expenseApprovalService.getExpenseApprovalsByUser(userIdx);
        List<ExpenseApprovalDTO> responseDTOs = expenseApprovals.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDTOs);
    }

    /**
     * 지출승인서 삭제
     * DELETE /api/approval/expense/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Void> deleteExpenseApproval(@PathVariable Long idx) {
        log.debug("DELETE /api/approval/expense/{}", idx);

        expenseApprovalService.deleteExpenseApproval(idx);

        return ResponseEntity.noContent().build();
    }

    /**
     * ExpenseApproval Entity를 ExpenseApprovalDTO로 변환
     */
    private ExpenseApprovalDTO mapToDTO(ExpenseApproval entity) {
        List<ExpenseDetailDTO> detailDTOs = entity.getExpenseDetails() != null
                ? entity.getExpenseDetails().stream()
                .map(this::mapDetailToDTO)
                .collect(Collectors.toList())
                : List.of();

        return ExpenseApprovalDTO.builder()
                .idx(entity.getIdx())
                .userIdx(entity.getUserIdx())
                .documentDate(entity.getDocumentDate())
                .projectName(entity.getProjectName())
                .applyDate(entity.getApplyDate())
                .totalAmount(entity.getTotalAmount())
                .content(entity.getContent())
                .documentIdx(entity.getDocumentIdx())
                .expenseDetails(detailDTOs)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .build();
    }

    /**
     * ExpenseDetail Entity를 ExpenseDetailDTO로 변환
     */
    private ExpenseDetailDTO mapDetailToDTO(ExpenseDetail entity) {
        return ExpenseDetailDTO.builder()
                .expenseDate(entity.getExpenseDate())
                .description(entity.getDescription())
                .shopName(entity.getShopName())
                .amount(entity.getAmount())
                .note(entity.getNote())
                .build();
    }
}
