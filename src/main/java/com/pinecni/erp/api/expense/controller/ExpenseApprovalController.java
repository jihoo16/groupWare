package com.pinecni.erp.api.expense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalAttachmentDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalDTO;
import com.pinecni.erp.api.expense.dto.ExpenseDetailDTO;
import com.pinecni.erp.entity.ExpenseApproval;
import com.pinecni.erp.entity.ExpenseDetail;
import com.pinecni.erp.api.expense.service.ExpenseApprovalService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final ObjectMapper objectMapper;

    @Value("${file.base.dir}")
    private String baseDir;

    /**
     * 현재 기간(전월 14일 ~ 당월 13일) 내 문서 존재 여부 확인
     * GET /api/approval/expense/check-period
     */
    @GetMapping("/check-period")
    public ResponseEntity<Map<String, Object>> checkCurrentPeriod(HttpSession session) {
        Long loginUserIdx = getLoginUserIdx(session);
        return ResponseEntity.ok(expenseApprovalService.checkCurrentPeriod(loginUserIdx));
    }

    /**
     * 지출승인서 생성 (multipart/form-data)
     * POST /api/approval/expense
     * - data: JSON (ExpenseApprovalCreateDTO)
     * - receiptFiles: 영수증 파일 (optional)
     * - signedDocFiles: 서명완료 공식문서 파일 (optional)
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createExpenseApproval(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "signedDocFiles", required = false) MultipartFile[] signedDocFiles,
            HttpSession session) {

        Long loginUserIdx = getLoginUserIdx(session);
        try {
            ExpenseApprovalCreateDTO createDTO = objectMapper.readValue(dataJson, ExpenseApprovalCreateDTO.class);
            createDTO.setUserIdx(loginUserIdx);

            ExpenseApproval created = expenseApprovalService.createExpenseApproval(createDTO);

            if (receiptFiles != null && receiptFiles.length > 0) {
                expenseApprovalService.saveAttachments(created.getIdx(), receiptFiles, "RECEIPT", loginUserIdx);
            }
            if (signedDocFiles != null && signedDocFiles.length > 0) {
                expenseApprovalService.saveAttachments(created.getIdx(), signedDocFiles, "DOCUMENT", loginUserIdx);
            }

            List<ExpenseApprovalAttachmentDTO> attachments = expenseApprovalService.getAttachments(created.getIdx());
            return ResponseEntity.status(HttpStatus.CREATED).body(mapToDTO(created, attachments));
        } catch (Exception e) {
            log.error("지출승인서 생성 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
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
        List<ExpenseApprovalDTO> result = list.stream().map(e -> mapToDTO(e, List.of())).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * 지출승인서 상세 조회 (첨부파일 포함)
     * GET /api/approval/expense/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ExpenseApprovalDTO> getExpenseApproval(
            @PathVariable Long idx,
            HttpSession session) {
        log.debug("GET /api/approval/expense/{}", idx);

        Long loginUserIdx = getLoginUserIdx(session);
        ExpenseApproval expenseApproval = expenseApprovalService.getExpenseApprovalWithDetails(idx);

        if (!expenseApproval.getUserIdx().equals(loginUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 조회할 수 있습니다.");
        }

        List<ExpenseApprovalAttachmentDTO> attachments = expenseApprovalService.getAttachments(idx);
        return ResponseEntity.ok(mapToDTO(expenseApproval, attachments));
    }

    /**
     * 지출승인서 수정 (multipart/form-data)
     * PUT /api/approval/expense/{idx}
     */
    @PutMapping(value = "/{idx}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateExpenseApproval(
            @PathVariable Long idx,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "signedDocFiles", required = false) MultipartFile[] signedDocFiles,
            HttpSession session) {

        Long loginUserIdx = getLoginUserIdx(session);
        try {
            ExpenseApprovalCreateDTO updateDTO = objectMapper.readValue(dataJson, ExpenseApprovalCreateDTO.class);
            ExpenseApproval updated = expenseApprovalService.updateExpenseApproval(idx, updateDTO, loginUserIdx);

            // 삭제 요청된 첨부파일 처리
            if (updateDTO.getDeletedAttachmentIds() != null) {
                for (Long attachmentIdx : updateDTO.getDeletedAttachmentIds()) {
                    expenseApprovalService.deleteAttachment(attachmentIdx, loginUserIdx);
                }
            }

            if (receiptFiles != null && receiptFiles.length > 0) {
                expenseApprovalService.saveAttachments(idx, receiptFiles, "RECEIPT", loginUserIdx);
            }
            if (signedDocFiles != null && signedDocFiles.length > 0) {
                expenseApprovalService.saveAttachments(idx, signedDocFiles, "DOCUMENT", loginUserIdx);
            }

            List<ExpenseApprovalAttachmentDTO> attachments = expenseApprovalService.getAttachments(idx);
            return ResponseEntity.ok(mapToDTO(updated, attachments));
        } catch (Exception e) {
            log.error("지출승인서 수정 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
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

    /**
     * 첨부파일 추가 (상세페이지에서 직접 업로드)
     * POST /api/approval/expense/{idx}/attachments
     */
    @PostMapping(value = "/{idx}/attachments", consumes = {"multipart/form-data"})
    public ResponseEntity<?> addAttachments(
            @PathVariable Long idx,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "signedDocFiles", required = false) MultipartFile[] signedDocFiles,
            HttpSession session) {

        Long loginUserIdx = getLoginUserIdx(session);
        try {
            // 본인 문서 확인
            ExpenseApproval approval = expenseApprovalService.getExpenseApprovalWithDetails(idx);
            if (!approval.getUserIdx().equals(loginUserIdx)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if (receiptFiles != null && receiptFiles.length > 0) {
                expenseApprovalService.saveAttachments(idx, receiptFiles, "RECEIPT", loginUserIdx);
            }
            if (signedDocFiles != null && signedDocFiles.length > 0) {
                expenseApprovalService.saveAttachments(idx, signedDocFiles, "DOCUMENT", loginUserIdx);
            }

            List<ExpenseApprovalAttachmentDTO> attachments = expenseApprovalService.getAttachments(idx);
            return ResponseEntity.ok(attachments);
        } catch (Exception e) {
            log.error("첨부파일 추가 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 첨부파일 소프트 딜리트
     * DELETE /api/approval/expense/attachments/{attachmentIdx}
     */
    @DeleteMapping("/attachments/{attachmentIdx}")
    public ResponseEntity<?> deleteAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {

        Long loginUserIdx = getLoginUserIdx(session);
        try {
            expenseApprovalService.deleteAttachment(attachmentIdx, loginUserIdx);
            Map<String, String> res = new HashMap<>();
            res.put("message", "첨부파일이 삭제되었습니다.");
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 첨부파일 다운로드
     * GET /api/approval/expense/attachments/{attachmentIdx}/download
     */
    @GetMapping("/attachments/{attachmentIdx}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentIdx) {
        try {
            ExpenseApprovalAttachmentDTO attachment = expenseApprovalService.getAttachmentById(attachmentIdx);
            Path filePath = Paths.get(baseDir).resolve(attachment.getFilePath()).resolve(attachment.getStoredFilename());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String encodedFilename = URLEncoder.encode(attachment.getOriginalFilename(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename*=UTF-8''" + encodedFilename)
                    .body(resource);
        } catch (Exception e) {
            log.error("첨부파일 다운로드 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 본인 지출승인서 첨부파일 상태 조회
     * GET /api/approval/expense/attachment-status
     * 반환: { idx: "all" | "partial" | "ok" }
     *   - all: 영수증+공식문서 모두 없음
     *   - partial: 둘 중 하나만 있음
     *   - ok: 둘 다 있음
     */
    @GetMapping("/attachment-status")
    public ResponseEntity<Map<String, String>> getAttachmentStatus(HttpSession session) {
        Long loginUserIdx = getLoginUserIdx(session);
        List<ExpenseApproval> approvals = expenseApprovalService.getExpenseApprovalsByUser(loginUserIdx);
        Map<String, String> result = new HashMap<>();
        for (ExpenseApproval ea : approvals) {
            var atts = expenseApprovalService.getAttachments(ea.getIdx());
            boolean hasReceipt  = atts.stream().anyMatch(a -> "RECEIPT".equals(a.getAttachmentType()));
            boolean hasDocument = atts.stream().anyMatch(a -> "DOCUMENT".equals(a.getAttachmentType()));
            String status;
            if (hasReceipt && hasDocument) status = "ok";
            else if (!hasReceipt && !hasDocument) status = "all";
            else status = "partial";
            result.put(String.valueOf(ea.getIdx()), status);
        }
        return ResponseEntity.ok(result);
    }

    // ── private helpers ────────────────────────────────────────────────────

    private Long getLoginUserIdx(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userIdx;
    }

    private ExpenseApprovalDTO mapToDTO(ExpenseApproval entity, List<ExpenseApprovalAttachmentDTO> attachments) {
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
                .attachments(attachments != null ? attachments : List.of())
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
