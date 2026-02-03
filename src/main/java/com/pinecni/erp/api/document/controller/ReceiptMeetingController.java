package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import com.pinecni.erp.api.document.service.ReceiptMeetingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
        } else if (status != null) {
            receiptMeetings = receiptMeetingService.getReceiptMeetingsByStatus(status);
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
     * 특정 날짜에 특정 참석자가 포함된 회의록 목록 조회 (중복 검증용)
     * GET /api/receipt-meetings/check-duplicate?date={date}&attendeeIdx={attendeeIdx}&projectIdx={projectIdx}
     */
    @GetMapping("/check-duplicate")
    public ResponseEntity<?> checkDuplicateAttendee(
            @RequestParam String date,
            @RequestParam(required = false) Long attendeeIdx,
            @RequestParam(required = false) Long projectIdx) {

        log.debug("GET /api/receipt-meetings/check-duplicate - date: {}, attendeeIdx: {}, projectIdx: {}",
                  date, attendeeIdx, projectIdx);

        // attendeeIdx 유효성 검증
        if (attendeeIdx == null || attendeeIdx <= 0) {
            log.warn("유효하지 않은 attendeeIdx: {}", attendeeIdx);
            Map<String, String> error = new HashMap<>();
            error.put("error", "유효하지 않은 참석자 ID입니다.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            List<Map<String, Object>> duplicates = receiptMeetingService.findDuplicateAttendee(date, attendeeIdx, projectIdx);
            return ResponseEntity.ok(duplicates);
        } catch (Exception e) {
            log.error("중복 검증 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "중복 검증 중 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
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
            ReceiptMeetingCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptMeetingCreateDTO.class);

            // 담당자 정보 자동 설정
            createDTO.setAuthorIdx(currentUserIdx);
            createDTO.setAuthorName(currentUserName);

            log.debug("POST /api/receipt-meetings - projectIdx: {}, authorIdx: {}, authorName: {}, 파일 개수: {}",
                    createDTO.getProjectIdx(), currentUserIdx, currentUserName, files != null ? files.length : 0);

            // 회의록 생성
            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.createReceiptMeeting(createDTO);

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
            @RequestBody ReceiptMeetingUpdateDTO updateDTO) {
        log.debug("PUT /api/receipt-meetings/{}", idx);

        try {
            ReceiptMeetingDTO receiptMeeting = receiptMeetingService.updateReceiptMeeting(idx, updateDTO);
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
