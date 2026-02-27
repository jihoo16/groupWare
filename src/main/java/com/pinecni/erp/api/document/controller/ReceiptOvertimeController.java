package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeDTO;
import com.pinecni.erp.api.document.service.ReceiptOvertimeService;
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
 * 연구비증빙 야근식대 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-overtimes")
@RequiredArgsConstructor
public class ReceiptOvertimeController {

    private final ReceiptOvertimeService receiptOvertimeService;
    private final ObjectMapper objectMapper;

    @Value("${file.base.dir}")
    private String baseDir;

    /**
     * 전체 야근식대 목록 조회
     * GET /api/receipt-overtimes
     */
    @GetMapping
    public ResponseEntity<List<ReceiptOvertimeDTO>> getAllReceiptOvertimes(
            @RequestParam(required = false) Long projectIdx,
            @RequestParam(required = false) Long authorIdx) {

        log.debug("GET /api/receipt-overtimes - projectIdx: {}, authorIdx: {}", projectIdx, authorIdx);

        List<ReceiptOvertimeDTO> receiptOvertimes;

        if (projectIdx != null) {
            receiptOvertimes = receiptOvertimeService.getReceiptOvertimesByProjectIdx(projectIdx);
        } else if (authorIdx != null) {
            receiptOvertimes = receiptOvertimeService.getReceiptOvertimesByAuthorIdx(authorIdx);

        } else {
            receiptOvertimes = receiptOvertimeService.getAllReceiptOvertimes();
        }

        return ResponseEntity.ok(receiptOvertimes);
    }

    /**
     * 야근식대 상세 조회
     * GET /api/receipt-overtimes/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ReceiptOvertimeDTO> getReceiptOvertimeById(@PathVariable Long idx) {
        log.debug("GET /api/receipt-overtimes/{}", idx);

        try {
            ReceiptOvertimeDTO receiptOvertime = receiptOvertimeService.getReceiptOvertimeById(idx);
            return ResponseEntity.ok(receiptOvertime);
        } catch (IllegalArgumentException e) {
            log.error("야근식대 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * ApprovalDocument IDX로 야근식대 조회
     * GET /api/receipt-overtimes/by-document/{documentIdx}
     */
    @GetMapping("/by-document/{documentIdx}")
    public ResponseEntity<ReceiptOvertimeDTO> getReceiptOvertimeByDocumentIdx(@PathVariable Long documentIdx) {
        log.debug("GET /api/receipt-overtimes/by-document/{}", documentIdx);

        try {
            ReceiptOvertimeDTO receiptOvertime = receiptOvertimeService.getReceiptOvertimeByDocumentIdx(documentIdx);
            return ResponseEntity.ok(receiptOvertime);
        } catch (IllegalArgumentException e) {
            log.error("야근식대 조회 실패 (documentIdx): {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 야근식대 생성 (파일 첨부 포함)
     * POST /api/receipt-overtimes
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createReceiptOvertime(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            jakarta.servlet.http.HttpSession session) {

        // 세션에서 현재 로그인한 사용자 정보 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        String currentUserName = (String) session.getAttribute("empName");

        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            // JSON 문자열을 DTO로 변환
            ReceiptOvertimeCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptOvertimeCreateDTO.class);

            log.debug("POST /api/receipt-overtimes - projectIdx: {}, authorIdx: {}, 영수증파일: {}, 공식문서파일: {}",
                    createDTO.getProjectIdx(), createDTO.getAuthorIdx(),
                    receiptFiles != null ? receiptFiles.length : 0,
                    documentFiles != null ? documentFiles.length : 0);

            // 야근식대 생성
            ReceiptOvertimeDTO receiptOvertime = receiptOvertimeService.createReceiptOvertime(createDTO, currentUserIdx);

            // 첨부파일 저장 (타입별 분리)
            if (receiptFiles != null && receiptFiles.length > 0) {
                List<ReceiptOvertimeAttachmentDTO> attachments = receiptOvertimeService.saveAttachments(
                        receiptOvertime.getIdx(), receiptFiles, "RECEIPT");
                log.debug("영수증 첨부파일 {}개 저장 완료", attachments.size());
            }
            if (documentFiles != null && documentFiles.length > 0) {
                List<ReceiptOvertimeAttachmentDTO> attachments = receiptOvertimeService.saveAttachments(
                        receiptOvertime.getIdx(), documentFiles, "DOCUMENT");
                log.debug("공식문서 첨부파일 {}개 저장 완료", attachments.size());
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(receiptOvertime);
        } catch (Exception e) {
            log.error("야근식대 생성 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 야근식대 수정 (파일 첨부 포함)
     * PUT /api/receipt-overtimes/{idx}
     */
    @PutMapping(value = "/{idx}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateReceiptOvertime(
            @PathVariable Long idx,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            jakarta.servlet.http.HttpSession session) {

        Long currentUserIdx = (Long) session.getAttribute("userIdx");

        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptOvertimeCreateDTO updateDTO = objectMapper.readValue(dataJson, ReceiptOvertimeCreateDTO.class);

            log.debug("PUT /api/receipt-overtimes/{} - projectIdx: {}, 영수증파일: {}, 공식문서파일: {}",
                    idx, updateDTO.getProjectIdx(),
                    receiptFiles != null ? receiptFiles.length : 0,
                    documentFiles != null ? documentFiles.length : 0);

            // 야근식대 수정
            ReceiptOvertimeDTO receiptOvertime = receiptOvertimeService.updateReceiptOvertime(idx, updateDTO, currentUserIdx);

            // 새 첨부파일 저장 (타입별 분리)
            if (receiptFiles != null && receiptFiles.length > 0) {
                List<ReceiptOvertimeAttachmentDTO> attachments = receiptOvertimeService.saveAttachments(
                        receiptOvertime.getIdx(), receiptFiles, "RECEIPT");
                log.debug("영수증 첨부파일 {}개 저장 완료", attachments.size());
            }
            if (documentFiles != null && documentFiles.length > 0) {
                List<ReceiptOvertimeAttachmentDTO> attachments = receiptOvertimeService.saveAttachments(
                        receiptOvertime.getIdx(), documentFiles, "DOCUMENT");
                log.debug("공식문서 첨부파일 {}개 저장 완료", attachments.size());
            }

            return ResponseEntity.ok(receiptOvertime);
        } catch (IllegalArgumentException e) {
            log.error("야근식대 수정 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("야근식대 수정 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 야근식대 삭제 (소프트 딜리트)
     * DELETE /api/receipt-overtimes/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteReceiptOvertime(
            @PathVariable Long idx,
            jakarta.servlet.http.HttpSession session) {
        log.debug("DELETE /api/receipt-overtimes/{}", idx);

        Long currentUserIdx = (Long) session.getAttribute("userIdx");

        try {
            receiptOvertimeService.deleteReceiptOvertime(idx, currentUserIdx);

            Map<String, String> response = new HashMap<>();
            response.put("message", "야근식대가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("야근식대 삭제 실패: {}", e.getMessage());

            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("야근식대 삭제 중 오류 발생: {}", e.getMessage(), e);

            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 야근식대 첨부파일 목록 조회
     * GET /api/receipt-overtimes/{idx}/attachments
     */
    @GetMapping("/{idx}/attachments")
    public ResponseEntity<List<ReceiptOvertimeAttachmentDTO>> getAttachments(@PathVariable Long idx) {
        log.debug("GET /api/receipt-overtimes/{}/attachments", idx);

        try {
            List<ReceiptOvertimeAttachmentDTO> attachments = receiptOvertimeService.getAttachmentsByReceiptOvertimeIdx(idx);
            return ResponseEntity.ok(attachments);
        } catch (Exception e) {
            log.error("첨부파일 목록 조회 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 야근식대 첨부파일 다운로드
     * GET /api/receipt-overtimes/attachments/{attachmentIdx}/download
     */
    @GetMapping("/attachments/{attachmentIdx}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentIdx) {
        log.debug("GET /api/receipt-overtimes/attachments/{}/download", attachmentIdx);

        try {
            ReceiptOvertimeAttachmentDTO attachment = receiptOvertimeService.getAttachmentById(attachmentIdx);

            Path filePath = Paths.get(baseDir).resolve(attachment.getFilePath()).resolve(attachment.getStoredFilename());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                log.error("파일을 찾을 수 없거나 읽을 수 없습니다: {}", filePath);
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
     * 야근식대 첨부파일 삭제
     * DELETE /api/receipt-overtimes/attachments/{attachmentIdx}
     */
    @DeleteMapping("/attachments/{attachmentIdx}")
    public ResponseEntity<Map<String, String>> deleteAttachment(@PathVariable Long attachmentIdx) {
        log.debug("DELETE /api/receipt-overtimes/attachments/{}", attachmentIdx);

        try {
            receiptOvertimeService.deleteAttachment(attachmentIdx);

            Map<String, String> response = new HashMap<>();
            response.put("message", "첨부파일이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
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
