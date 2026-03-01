package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import com.pinecni.erp.api.document.service.ReceiptMeetingService;
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
 * 연구비증빙 회의록 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-meetings")
@RequiredArgsConstructor
public class ReceiptMeetingController {

    private final ReceiptMeetingService receiptMeetingService;
    private final ObjectMapper objectMapper;

    @Value("${file.base.dir}")
    private String baseDir;

    /**
     * 전체 회의록 목록 조회
     * GET /api/receipt-meetings
     */
    @GetMapping
    public ResponseEntity<List<ReceiptMeetingDTO>> getAllReceiptMeetings(
            @RequestParam(required = false) Long projectIdx,
            @RequestParam(required = false) Long authorIdx,
            @RequestParam(required = false) String status) {

        log.debug("GET /api/receipt-meetings - projectIdx: {}, authorIdx: {}, status: {}", projectIdx, authorIdx, status);

        List<ReceiptMeetingDTO> receiptMeetings;

        if (projectIdx != null) {
            receiptMeetings = receiptMeetingService.getReceiptMeetingsByProjectIdx(projectIdx);
        } else if (authorIdx != null) {
            receiptMeetings = receiptMeetingService.getReceiptMeetingsByAuthorIdx(authorIdx);
        } else {
            receiptMeetings = receiptMeetingService.getAllReceiptMeetings();
        }

        return ResponseEntity.ok(receiptMeetings);
    }

    /**
     * 회의록 상세 조회
     * GET /api/receipt-meetings/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ReceiptMeetingDTO> getReceiptMeetingById(@PathVariable Long idx) {
        log.debug("GET /api/receipt-meetings/{}", idx);

        try {
            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.getReceiptMeetingById(idx);
            return ResponseEntity.ok(receiptMeeting);
        } catch (IllegalArgumentException e) {
            log.error("회의록 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 회의록 생성 (파일 첨부 포함)
     * POST /api/receipt-meetings
     * - receiptFiles: 영수증 파일 (RECEIPT)
     * - documentFiles: 공식문서 파일 (DOCUMENT)
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createReceiptMeeting(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            HttpSession session) {

        Long currentUserIdx = (Long) session.getAttribute("userIdx");

        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptMeetingCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptMeetingCreateDTO.class);

            log.debug("POST /api/receipt-meetings - projectIdx: {}, authorIdx: {}, 영수증: {}개, 공식문서: {}개",
                    createDTO.getProjectIdx(), createDTO.getAuthorIdx(),
                    receiptFiles != null ? receiptFiles.length : 0,
                    documentFiles != null ? documentFiles.length : 0);

            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.createReceiptMeeting(createDTO, currentUserIdx);

            if (receiptFiles != null && receiptFiles.length > 0) {
                receiptMeetingService.saveAttachments(receiptMeeting.getIdx(), receiptFiles, "RECEIPT", currentUserIdx);
            }
            if (documentFiles != null && documentFiles.length > 0) {
                receiptMeetingService.saveAttachments(receiptMeeting.getIdx(), documentFiles, "DOCUMENT", currentUserIdx);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(receiptMeeting);
        } catch (Exception e) {
            log.error("회의록 생성 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 회의록 수정 (파일 추가/삭제 포함)
     * PUT /api/receipt-meetings/{idx}
     * - data: JSON (ReceiptMeetingUpdateDTO, deletedAttachmentIds 포함)
     * - receiptFiles: 새로 추가할 영수증 파일 (RECEIPT)
     * - documentFiles: 새로 추가할 공식문서 파일 (DOCUMENT)
     */
    @PutMapping(value = "/{idx}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateReceiptMeeting(
            @PathVariable Long idx,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            HttpSession session) {

        log.debug("PUT /api/receipt-meetings/{}", idx);

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptMeetingUpdateDTO updateDTO = objectMapper.readValue(dataJson, ReceiptMeetingUpdateDTO.class);

            // 1. 회의록 데이터 + 참석자 수정
            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.updateReceiptMeeting(idx, updateDTO, currentUserIdx);

            // 2. 삭제 요청된 첨부파일 소프트 딜리트
            if (updateDTO.getDeletedAttachmentIds() != null) {
                for (Long attachmentIdx : updateDTO.getDeletedAttachmentIds()) {
                    receiptMeetingService.softDeleteAttachment(attachmentIdx, currentUserIdx);
                }
                log.debug("첨부파일 {}개 소프트 딜리트 완료", updateDTO.getDeletedAttachmentIds().size());
            }

            // 3. 새 영수증 파일 저장
            if (receiptFiles != null && receiptFiles.length > 0) {
                receiptMeetingService.saveAttachments(idx, receiptFiles, "RECEIPT", currentUserIdx);
                log.debug("영수증 파일 {}개 저장 완료", receiptFiles.length);
            }

            // 4. 새 공식문서 파일 저장
            if (documentFiles != null && documentFiles.length > 0) {
                receiptMeetingService.saveAttachments(idx, documentFiles, "DOCUMENT", currentUserIdx);
                log.debug("공식문서 파일 {}개 저장 완료", documentFiles.length);
            }

            return ResponseEntity.ok(receiptMeeting);
        } catch (IllegalArgumentException e) {
            log.error("회의록 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("회의록 수정 중 오류 발생: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 회의록 첨부파일 추가 (문서 목록에서 빠른 추가)
     * POST /api/receipt-meetings/{idx}/attachments
     */
    @PostMapping(value = "/{idx}/attachments", consumes = {"multipart/form-data"})
    public ResponseEntity<?> addAttachments(
            @PathVariable Long idx,
            @RequestPart(value = "receiptFiles", required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            HttpSession session) {

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            if (receiptFiles != null && receiptFiles.length > 0) {
                receiptMeetingService.saveAttachments(idx, receiptFiles, "RECEIPT", currentUserIdx);
            }
            if (documentFiles != null && documentFiles.length > 0) {
                receiptMeetingService.saveAttachments(idx, documentFiles, "DOCUMENT", currentUserIdx);
            }
            List<ReceiptMeetingAttachmentDTO> attachments = receiptMeetingService.getAttachmentsByReceiptMeetingIdx(idx);
            return ResponseEntity.ok(attachments);
        } catch (Exception e) {
            log.error("회의록 첨부파일 추가 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 회의록 삭제 (Soft Delete)
     * DELETE /api/receipt-meetings/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteReceiptMeeting(
            @PathVariable Long idx,
            @RequestBody Map<String, Long> requestBody) {
        log.debug("DELETE /api/receipt-meetings/{}", idx);

        try {
            Long deletedUserIdx = requestBody.get("deletedUserIdx");
            if (deletedUserIdx == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "삭제한 사용자 정보가 필요합니다.");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }

            receiptMeetingService.deleteReceiptMeeting(idx, deletedUserIdx);

            Map<String, String> response = new HashMap<>();
            response.put("message", "회의록이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("회의록 삭제 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("회의록 삭제 중 오류 발생: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 회의록 첨부파일 다운로드
     * GET /api/receipt-meetings/attachments/{attachmentIdx}/download
     */
    @GetMapping("/attachments/{attachmentIdx}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentIdx) {
        log.debug("GET /api/receipt-meetings/attachments/{}/download", attachmentIdx);

        try {
            ReceiptMeetingAttachmentDTO attachment = receiptMeetingService.getAttachmentById(attachmentIdx);

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
