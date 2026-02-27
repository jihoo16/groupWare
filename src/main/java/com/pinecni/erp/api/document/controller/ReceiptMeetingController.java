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
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createReceiptMeeting(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "files", required = false) MultipartFile[] files,
            HttpSession session) {

        // 세션에서 현재 로그인한 사용자 정보 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");

        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            // JSON 문자열을 DTO로 변환
            ReceiptMeetingCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptMeetingCreateDTO.class);

            log.debug("POST /api/receipt-meetings - projectIdx: {}, authorIdx: {}, 파일 개수: {}",
                    createDTO.getProjectIdx(), createDTO.getAuthorIdx(), files != null ? files.length : 0);

            // 회의록 생성
            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.createReceiptMeeting(createDTO, currentUserIdx);

            // 첨부파일 저장
            if (files != null && files.length > 0) {
                List<ReceiptMeetingAttachmentDTO> attachments = receiptMeetingService.saveAttachments(
                        receiptMeeting.getIdx(), files, currentUserIdx);
                log.debug("첨부파일 {}개 저장 완료", attachments.size());
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
     * 회의록 수정
     * PUT /api/receipt-meetings/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ReceiptMeetingDTO> updateReceiptMeeting(
            @PathVariable Long idx,
            @RequestBody ReceiptMeetingUpdateDTO updateDTO,
            HttpSession session) {
        log.debug("PUT /api/receipt-meetings/{}", idx);

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        try {
            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.updateReceiptMeeting(idx, updateDTO,currentUserIdx);
            return ResponseEntity.ok(receiptMeeting);
        } catch (IllegalArgumentException e) {
            log.error("회의록 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("회의록 수정 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 회의록 삭제 (Soft Delete)
     * DELETE /api/receipt-meetings/{idx}
     * @param idx 회의록 IDX
     * @param requestBody 삭제 요청 정보 (deletedUserIdx 포함)
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
