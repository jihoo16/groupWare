package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptTripAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripUpdateDTO;
import com.pinecni.erp.api.document.service.ReceiptTripService;
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
 * 연구비증빙 단독출장 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-trips")
@RequiredArgsConstructor
public class ReceiptTripController {

    private final ReceiptTripService receiptTripService;
    private final ObjectMapper objectMapper;

    @Value("${file.base.dir}")
    private String baseDir;

    /**
     * 전체 출장 목록 조회
     * GET /api/receipt-trips
     */
    @GetMapping
    public ResponseEntity<List<ReceiptTripDTO>> getAllReceiptTrips(
            @RequestParam(required = false) Long projectIdx,
            @RequestParam(required = false) Long authorIdx,
            @RequestParam(required = false) String status) {

        log.debug("GET /api/receipt-trips - projectIdx: {}, authorIdx: {}, status: {}", projectIdx, authorIdx, status);

        List<ReceiptTripDTO> receiptTrips;
        if (projectIdx != null) {
            receiptTrips = receiptTripService.getReceiptTripsByProjectIdx(projectIdx);
        } else if (authorIdx != null) {
            receiptTrips = receiptTripService.getReceiptTripsByAuthorIdx(authorIdx);
        } else if (status != null) {
            receiptTrips = receiptTripService.getReceiptTripsByStatus(status);
        } else {
            receiptTrips = receiptTripService.getAllReceiptTrips();
        }

        return ResponseEntity.ok(receiptTrips);
    }

    /**
     * 출장 상세 조회
     * GET /api/receipt-trips/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ReceiptTripDTO> getReceiptTripById(@PathVariable Long idx) {
        log.debug("GET /api/receipt-trips/{}", idx);
        try {
            return ResponseEntity.ok(receiptTripService.getReceiptTripById(idx));
        } catch (IllegalArgumentException e) {
            log.error("출장 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 출장 생성 (파일 첨부 포함)
     * POST /api/receipt-trips
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createReceiptTrip(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles",  required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            HttpSession session) {

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptTripCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptTripCreateDTO.class);
            // drafterUserIdx는 프론트에서 선택한 작성자 IDX — 세션 유저로 덮어쓰지 않는다

            log.debug("POST /api/receipt-trips - projectIdx: {}, drafterUserIdx: {}, currentUserIdx: {}, 영수증: {}개, 공식문서: {}개",
                    createDTO.getProjectIdx(), createDTO.getDrafterUserIdx(), currentUserIdx,
                    receiptFiles  != null ? receiptFiles.length  : 0,
                    documentFiles != null ? documentFiles.length : 0);

            ReceiptTripDTO receiptTrip = receiptTripService.createReceiptTrip(createDTO, currentUserIdx);

            if (receiptFiles != null && receiptFiles.length > 0) {
                receiptTripService.saveAttachments(receiptTrip.getIdx(), receiptFiles, "RECEIPT", currentUserIdx);
            }
            if (documentFiles != null && documentFiles.length > 0) {
                receiptTripService.saveAttachments(receiptTrip.getIdx(), documentFiles, "DOCUMENT", currentUserIdx);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(receiptTrip);
        } catch (Exception e) {
            log.error("출장 생성 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 출장 수정 (파일 추가/삭제 포함)
     * PUT /api/receipt-trips/{idx}
     */
    @PutMapping(value = "/{idx}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateReceiptTrip(
            @PathVariable Long idx,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "receiptFiles",  required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            HttpSession session) {

        log.debug("PUT /api/receipt-trips/{}", idx);

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ReceiptTripUpdateDTO updateDTO = objectMapper.readValue(dataJson, ReceiptTripUpdateDTO.class);

            ReceiptTripDTO receiptTrip = receiptTripService.updateReceiptTrip(idx, updateDTO, currentUserIdx);

            if (receiptFiles != null && receiptFiles.length > 0) {
                receiptTripService.saveAttachments(idx, receiptFiles, "RECEIPT", currentUserIdx);
                log.debug("영수증 파일 {}개 저장 완료", receiptFiles.length);
            }
            if (documentFiles != null && documentFiles.length > 0) {
                receiptTripService.saveAttachments(idx, documentFiles, "DOCUMENT", currentUserIdx);
                log.debug("공식문서 파일 {}개 저장 완료", documentFiles.length);
            }

            return ResponseEntity.ok(receiptTrip);
        } catch (IllegalArgumentException e) {
            log.error("출장 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("출장 수정 중 오류 발생: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 출장 삭제 (소프트 딜리트)
     * DELETE /api/receipt-trips/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteReceiptTrip(
            @PathVariable Long idx,
            HttpSession session) {

        log.debug("DELETE /api/receipt-trips/{}", idx);

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            receiptTripService.deleteReceiptTrip(idx, currentUserIdx);
            Map<String, String> response = new HashMap<>();
            response.put("message", "출장 정보가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("출장 삭제 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("출장 삭제 중 오류 발생: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "서버 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 출장 첨부파일 목록 조회
     * GET /api/receipt-trips/{idx}/attachments
     */
    @GetMapping("/{idx}/attachments")
    public ResponseEntity<List<ReceiptTripAttachmentDTO>> getAttachments(@PathVariable Long idx) {
        log.debug("GET /api/receipt-trips/{}/attachments", idx);
        try {
            return ResponseEntity.ok(receiptTripService.getAttachmentsByReceiptTripIdx(idx));
        } catch (Exception e) {
            log.error("첨부파일 목록 조회 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 출장 첨부파일 추가 (모달에서 빠른 추가)
     * POST /api/receipt-trips/{idx}/attachments
     */
    @PostMapping(value = "/{idx}/attachments", consumes = {"multipart/form-data"})
    public ResponseEntity<?> addAttachments(
            @PathVariable Long idx,
            @RequestPart(value = "receiptFiles",  required = false) MultipartFile[] receiptFiles,
            @RequestPart(value = "documentFiles", required = false) MultipartFile[] documentFiles,
            HttpSession session) {

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            if (receiptFiles != null && receiptFiles.length > 0) {
                receiptTripService.saveAttachments(idx, receiptFiles, "RECEIPT", currentUserIdx);
            }
            if (documentFiles != null && documentFiles.length > 0) {
                receiptTripService.saveAttachments(idx, documentFiles, "DOCUMENT", currentUserIdx);
            }
            return ResponseEntity.ok(receiptTripService.getAttachmentsByReceiptTripIdx(idx));
        } catch (Exception e) {
            log.error("출장 첨부파일 추가 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 출장 첨부파일 다운로드
     * GET /api/receipt-trips/attachments/{attachmentIdx}/download
     */
    @GetMapping("/attachments/{attachmentIdx}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentIdx) {
        log.debug("GET /api/receipt-trips/attachments/{}/download", attachmentIdx);
        try {
            ReceiptTripAttachmentDTO attachment = receiptTripService.getAttachmentById(attachmentIdx);

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
     * 출장 첨부파일 삭제 (소프트 딜리트)
     * DELETE /api/receipt-trips/attachments/{attachmentIdx}
     */
    @DeleteMapping("/attachments/{attachmentIdx}")
    public ResponseEntity<Map<String, String>> deleteAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {

        log.debug("DELETE /api/receipt-trips/attachments/{}", attachmentIdx);

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            receiptTripService.softDeleteAttachment(attachmentIdx, currentUserIdx);
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
