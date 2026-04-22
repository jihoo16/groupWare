package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseDTO;
import com.pinecni.erp.api.document.service.ReceiptPurchaseService;
import jakarta.servlet.http.HttpSession;
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

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    @Value("${file.base.dir}")
    private String baseDir;

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
            @RequestPart(value = "estimateFiles", required = false) List<MultipartFile> estimateFiles,
            @RequestPart(value = "bankCopyFiles", required = false) List<MultipartFile> bankCopyFiles,
            HttpSession session) {
        try {
            ReceiptPurchaseCreateDTO dto = objectMapper.readValue(dataJson, ReceiptPurchaseCreateDTO.class);
            Long userIdx = (Long) session.getAttribute("userIdx");
            ReceiptPurchaseDTO result = receiptPurchaseService.createReceiptPurchase(dto, receiptFiles, documentFiles, estimateFiles, bankCopyFiles, userIdx);
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
            @RequestPart(value = "estimateFiles", required = false) List<MultipartFile> estimateFiles,
            @RequestPart(value = "bankCopyFiles", required = false) List<MultipartFile> bankCopyFiles,
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
                    idx, dto, receiptFiles, documentFiles, estimateFiles, bankCopyFiles, deletedIds, userIdx);
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
        } catch (IllegalStateException e) {
            log.warn("구매품의 삭제 차단: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("구매품의 삭제 실패 - idx: {}", idx, e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "삭제에 실패했습니다: " + e.getMessage());
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

    /**
     * 첨부파일 추가 (목록 화면 모달에서 사용)
     * POST /api/receipt-purchases/{idx}/attachments
     */
    @PostMapping(value = "/{idx}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addAttachments(
            @PathVariable Long idx,
            @RequestPart(value = "receiptFiles", required = false) List<MultipartFile> receiptFiles,
            @RequestPart(value = "documentFiles", required = false) List<MultipartFile> documentFiles,
            @RequestPart(value = "estimateFiles", required = false) List<MultipartFile> estimateFiles,
            @RequestPart(value = "bankCopyFiles", required = false) List<MultipartFile> bankCopyFiles,
            HttpSession session) {
        try {
            Long userIdx = (Long) session.getAttribute("userIdx");
            List<ReceiptPurchaseAttachmentDTO> result = receiptPurchaseService.addAttachments(
                    idx, receiptFiles, documentFiles, estimateFiles, bankCopyFiles, userIdx);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("첨부파일 추가 실패 - idx: {}", idx, e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 첨부파일 다운로드
     * GET /api/receipt-purchases/attachments/{attachmentIdx}/download
     */
    @GetMapping("/attachments/{attachmentIdx}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentIdx) {
        log.debug("GET /api/receipt-purchases/attachments/{}/download", attachmentIdx);
        try {
            ReceiptPurchaseAttachmentDTO attachment = receiptPurchaseService.getAttachmentById(attachmentIdx);

            Path filePath = Paths.get(baseDir)
                    .resolve(attachment.getFilePath())
                    .resolve(attachment.getStoredFilename());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                log.error("파일을 찾을 수 없거나 읽을 수 없습니다: {}", filePath);
                return ResponseEntity.notFound().build();
            }

            String encodedFilename = URLEncoder.encode(attachment.getOriginalFilename(), StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFilename)
                    .body(resource);

        } catch (Exception e) {
            log.error("첨부파일 다운로드 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 첨부파일 삭제 (소프트 딜리트)
     * DELETE /api/receipt-purchases/attachments/{attachmentIdx}
     */
    @DeleteMapping("/attachments/{attachmentIdx}")
    public ResponseEntity<Map<String, String>> deleteAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {
        log.debug("DELETE /api/receipt-purchases/attachments/{}", attachmentIdx);

        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            receiptPurchaseService.softDeleteAttachment(attachmentIdx, userIdx);
            Map<String, String> response = new HashMap<>();
            response.put("message", "첨부파일이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("첨부파일 삭제 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("첨부파일 삭제 중 오류 발생: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
