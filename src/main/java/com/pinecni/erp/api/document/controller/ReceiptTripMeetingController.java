package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingResponseDTO;
import com.pinecni.erp.api.document.service.ReceiptTripMeetingService;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 출장+회의 통합 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-trip-meetings")
@RequiredArgsConstructor
public class ReceiptTripMeetingController {

    private final ReceiptTripMeetingService receiptTripMeetingService;
    private final ObjectMapper objectMapper;

    @Value("${file.base.dir}")
    private String baseDir;

    // ══════════════════════════════════════════════════════════════
    // 기본 CRUD
    // ══════════════════════════════════════════════════════════════

    /**
     * 목록 조회
     * GET /api/receipt-trip-meetings?projectIdx=&drafterUserIdx=
     */
    @GetMapping
    public ResponseEntity<List<ReceiptTripMeetingResponseDTO>> getReceiptTripMeetings(
            @RequestParam(required = false) Long projectIdx,
            @RequestParam(required = false) Long drafterUserIdx) {

        log.debug("GET /api/receipt-trip-meetings - projectIdx: {}, drafterUserIdx: {}", projectIdx, drafterUserIdx);
        List<ReceiptTripMeetingResponseDTO> result;
        if (projectIdx != null) {
            result = receiptTripMeetingService.getReceiptTripMeetingsByProjectIdx(projectIdx);
        } else if (drafterUserIdx != null) {
            result = receiptTripMeetingService.getReceiptTripMeetingsByDrafterUserIdx(drafterUserIdx);
        } else {
            Map<String, String> error = new HashMap<>();
            error.put("error", "projectIdx 또는 drafterUserIdx 파라미터가 필요합니다.");
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(result);
    }

    /**
     * 상세 조회
     * GET /api/receipt-trip-meetings/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingById(@PathVariable Long idx) {
        log.debug("GET /api/receipt-trip-meetings/{}", idx);
        try {
            return ResponseEntity.ok(receiptTripMeetingService.getReceiptTripMeetingById(idx));
        } catch (IllegalArgumentException e) {
            log.error("출장+회의 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 출장+회의 통합 저장
     * POST /api/receipt-trip-meetings
     * 세션별 파일: meetingReceiptFiles_0, meetingReceiptFiles_1, ...
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createReceiptTripMeeting(
            HttpServletRequest httpRequest,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "tripReceiptFiles",  required = false) MultipartFile[] tripReceiptFiles,
            @RequestPart(value = "tripDocumentFiles", required = false) MultipartFile[] tripDocumentFiles,
            HttpSession session) {

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptTripMeetingCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptTripMeetingCreateDTO.class);
            if (createDTO.getDrafterUserIdx() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "작성자를 선택해주세요."));
            }

            Map<Integer, MultipartFile[]> receiptMap  = extractSessionFiles(httpRequest, "meetingReceiptFiles");
            Map<Integer, MultipartFile[]> documentMap = extractSessionFiles(httpRequest, "meetingDocumentFiles");

            log.debug("POST /api/receipt-trip-meetings - projectIdx: {}, 회의세션파일: {}개 세션, 출장영수증: {}개",
                    createDTO.getProjectIdx(), receiptMap.size(),
                    tripReceiptFiles != null ? tripReceiptFiles.length : 0);

            ReceiptTripMeetingResponseDTO result = receiptTripMeetingService.createReceiptTripMeeting(
                    createDTO, receiptMap, documentMap, tripReceiptFiles, tripDocumentFiles, currentUserIdx);

            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (Exception e) {
            log.error("출장+회의 통합 저장 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 출장+회의 수정
     * PUT /api/receipt-trip-meetings/{idx}
     */
    @PutMapping(value = "/{idx}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateReceiptTripMeeting(
            HttpServletRequest httpRequest,
            @PathVariable Long idx,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "tripReceiptFiles",  required = false) MultipartFile[] tripReceiptFiles,
            @RequestPart(value = "tripDocumentFiles", required = false) MultipartFile[] tripDocumentFiles,
            HttpSession session) {

        log.debug("PUT /api/receipt-trip-meetings/{}", idx);
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptTripMeetingCreateDTO updateDTO = objectMapper.readValue(dataJson, ReceiptTripMeetingCreateDTO.class);
            Map<Integer, MultipartFile[]> receiptMap  = extractSessionFiles(httpRequest, "meetingReceiptFiles");
            Map<Integer, MultipartFile[]> documentMap = extractSessionFiles(httpRequest, "meetingDocumentFiles");

            ReceiptTripMeetingResponseDTO result = receiptTripMeetingService.updateReceiptTripMeeting(
                    idx, updateDTO, receiptMap, documentMap, tripReceiptFiles, tripDocumentFiles, currentUserIdx);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.error("출장+회의 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("출장+회의 수정 중 오류: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * FormData에서 세션별 파일 배열 추출
     * meetingReceiptFiles_0, meetingReceiptFiles_1, ... → Map{0→files[], 1→files[], ...}
     * meetingReceiptFiles (세션 없는 키) → Map{0→files[]}
     */
    private Map<Integer, MultipartFile[]> extractSessionFiles(HttpServletRequest request, String baseKey) {
        Map<Integer, MultipartFile[]> result = new HashMap<>();
        if (!(request instanceof MultipartHttpServletRequest multipart)) return result;

        // 세션 0: baseKey (backward compat)
        List<MultipartFile> s0 = multipart.getFiles(baseKey);
        if (!s0.isEmpty()) result.put(0, s0.toArray(new MultipartFile[0]));

        // 세션 1+: baseKey_1, baseKey_2, ...
        for (int i = 1; i <= 9; i++) {
            List<MultipartFile> files = multipart.getFiles(baseKey + "_" + i);
            if (!files.isEmpty()) result.put(i, files.toArray(new MultipartFile[0]));
        }
        return result;
    }

    /**
     * 출장+회의 삭제 (소프트 딜리트)
     * DELETE /api/receipt-trip-meetings/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteReceiptTripMeeting(
            @PathVariable Long idx,
            HttpSession session) {

        log.debug("DELETE /api/receipt-trip-meetings/{}", idx);
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            receiptTripMeetingService.deleteReceiptTripMeeting(idx, currentUserIdx);
            Map<String, String> response = new HashMap<>();
            response.put("message", "출장+회의 정보가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("출장+회의 삭제 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("출장+회의 삭제 중 오류: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 첨부파일
    // ══════════════════════════════════════════════════════════════

    /**
     * 첨부파일 추가 업로드 (목록 화면 모달에서 사용)
     * POST /api/receipt-trip-meetings/{idx}/attachments
     */
    @PostMapping(value = "/{idx}/attachments", consumes = {"multipart/form-data"})
    public ResponseEntity<?> addAttachments(
            @PathVariable Long idx,
            @RequestPart(value = "meetingReceiptFiles",  required = false) MultipartFile[] meetingReceiptFiles,
            @RequestPart(value = "meetingDocumentFiles", required = false) MultipartFile[] meetingDocumentFiles,
            @RequestPart(value = "tripReceiptFiles",     required = false) MultipartFile[] tripReceiptFiles,
            @RequestPart(value = "tripDocumentFiles",    required = false) MultipartFile[] tripDocumentFiles,
            HttpSession session) {

        log.debug("POST /api/receipt-trip-meetings/{}/attachments", idx);
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            receiptTripMeetingService.addAttachments(
                    idx, meetingReceiptFiles, meetingDocumentFiles, tripReceiptFiles, tripDocumentFiles, currentUserIdx);
            return ResponseEntity.ok(receiptTripMeetingService.getAttachmentsByReceiptTripMeetingIdx(idx));
        } catch (Exception e) {
            log.error("출장+회의 첨부파일 추가 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 첨부파일 목록 조회
     * GET /api/receipt-trip-meetings/{idx}/attachments
     */
    @GetMapping("/{idx}/attachments")
    public ResponseEntity<List<ReceiptTripMeetingAttachmentDTO>> getAttachments(@PathVariable Long idx) {
        log.debug("GET /api/receipt-trip-meetings/{}/attachments", idx);
        try {
            return ResponseEntity.ok(receiptTripMeetingService.getAttachmentsByReceiptTripMeetingIdx(idx));
        } catch (Exception e) {
            log.error("첨부파일 목록 조회 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 첨부파일 다운로드
     * GET /api/receipt-trip-meetings/attachments/{attachmentIdx}/download
     */
    @GetMapping("/attachments/{attachmentIdx}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentIdx) {
        log.debug("GET /api/receipt-trip-meetings/attachments/{}/download", attachmentIdx);
        try {
            ReceiptTripMeetingAttachmentDTO attachment = receiptTripMeetingService.getAttachmentById(attachmentIdx);

            Path filePath = Paths.get(baseDir)
                    .resolve(attachment.getFilePath())
                    .resolve(attachment.getStoredFilename());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                log.error("파일을 찾을 수 없습니다: {}", filePath);
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
     * 첨부파일 소프트 딜리트
     * DELETE /api/receipt-trip-meetings/attachments/{attachmentIdx}
     */
    @DeleteMapping("/attachments/{attachmentIdx}")
    public ResponseEntity<Map<String, String>> deleteAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {

        log.debug("DELETE /api/receipt-trip-meetings/attachments/{}", attachmentIdx);
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            receiptTripMeetingService.softDeleteAttachment(attachmentIdx, currentUserIdx);
            Map<String, String> response = new HashMap<>();
            response.put("message", "첨부파일이 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("첨부파일 삭제 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("첨부파일 삭제 중 오류: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error occurred", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
