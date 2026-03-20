package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseDTO;
import com.pinecni.erp.api.document.service.ReceiptPurchaseService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 재료비/장비비 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-purchases")
@RequiredArgsConstructor
public class ReceiptPurchaseController {

    private final ReceiptPurchaseService receiptPurchaseService;
    private final ObjectMapper objectMapper;

    /**
     * 목록 조회
     * GET /api/receipt-purchases?projectIdx=&authorIdx=&purchaseType=material
     */
    @GetMapping
    public ResponseEntity<List<ReceiptPurchaseDTO>> getAll(
            @RequestParam(required = false) Long projectIdx,
            @RequestParam(required = false) Long authorIdx,
            @RequestParam(required = false) String purchaseType) {
        log.debug("GET /api/receipt-purchases - projectIdx={}, authorIdx={}, purchaseType={}", projectIdx, authorIdx, purchaseType);
        List<ReceiptPurchaseDTO> list;
        if (projectIdx != null) {
            list = receiptPurchaseService.getReceiptPurchasesByProjectIdx(projectIdx);
        } else if (authorIdx != null) {
            list = receiptPurchaseService.getReceiptPurchasesByAuthorIdx(authorIdx);
        } else if (purchaseType != null) {
            list = receiptPurchaseService.getReceiptPurchasesByType(purchaseType);
        } else {
            list = receiptPurchaseService.getAllReceiptPurchases();
        }
        return ResponseEntity.ok(list);
    }

    /**
     * 단건 조회
     * GET /api/receipt-purchases/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ReceiptPurchaseDTO> getById(@PathVariable Long idx) {
        try {
            return ResponseEntity.ok(receiptPurchaseService.getReceiptPurchaseById(idx));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 저장
     * POST /api/receipt-purchases
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> create(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) List<MultipartFile> receiptFiles,
            @RequestPart(value = "documentFiles", required = false) List<MultipartFile> documentFiles,
            HttpSession session) {
        try {
            ReceiptPurchaseCreateDTO dto = objectMapper.readValue(dataJson, ReceiptPurchaseCreateDTO.class);
            Long userIdx = (Long) session.getAttribute("userIdx");
            ReceiptPurchaseDTO result = receiptPurchaseService.createReceiptPurchase(dto, receiptFiles, documentFiles, userIdx);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("구매품의 저장 실패", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "저장에 실패했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 수정
     * PUT /api/receipt-purchases/{idx}
     */
    @PutMapping(value = "/{idx}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> update(
            @PathVariable Long idx,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) List<MultipartFile> receiptFiles,
            @RequestPart(value = "documentFiles", required = false) List<MultipartFile> documentFiles,
            @RequestPart(value = "deletedAttachmentIds", required = false) String deletedIdsJson,
            HttpSession session) {
        try {
            ReceiptPurchaseCreateDTO dto = objectMapper.readValue(dataJson, ReceiptPurchaseCreateDTO.class);
            List<Long> deletedIds = null;
            if (deletedIdsJson != null && !deletedIdsJson.isBlank()) {
                deletedIds = objectMapper.readValue(deletedIdsJson,
                        objectMapper.getTypeFactory().constructCollectionType(List.class, Long.class));
            }
            Long userIdx = (Long) session.getAttribute("userIdx");
            ReceiptPurchaseDTO result = receiptPurchaseService.updateReceiptPurchase(
                    idx, dto, receiptFiles, documentFiles, deletedIds, userIdx);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("구매품의 수정 실패 - idx: {}", idx, e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "수정에 실패했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 삭제
     * DELETE /api/receipt-purchases/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<?> delete(@PathVariable Long idx, HttpSession session) {
        try {
            Long userIdx = (Long) session.getAttribute("userIdx");
            receiptPurchaseService.deleteReceiptPurchase(idx, userIdx);
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "삭제되었습니다.");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("구매품의 삭제 실패 - idx: {}", idx, e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "삭제에 실패했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 첨부파일 목록 조회
     * GET /api/receipt-purchases/{idx}/attachments
     */
    @GetMapping("/{idx}/attachments")
    public ResponseEntity<List<ReceiptPurchaseAttachmentDTO>> getAttachments(@PathVariable Long idx) {
        return ResponseEntity.ok(receiptPurchaseService.getAttachments(idx));
    }
}
