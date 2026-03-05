package com.pinecni.erp.api.document.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingResponseDTO;
import com.pinecni.erp.api.document.service.ReceiptTripMeetingService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * 연구비증빙 회의+출장 통합 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-trip-meetings")
@RequiredArgsConstructor
public class ReceiptTripMeetingController {

    private final ReceiptTripMeetingService receiptTripMeetingService;
    private final ObjectMapper objectMapper;

    /**
     * 회의+출장 통합 저장
     * POST /api/receipt-trip-meetings
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createReceiptTripMeeting(
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
            ReceiptTripMeetingCreateDTO createDTO = objectMapper.readValue(dataJson, ReceiptTripMeetingCreateDTO.class);
            createDTO.setDrafterUserIdx(currentUserIdx);

            log.debug("POST /api/receipt-trip-meetings - projectIdx: {}, 영수증: {}개, 공식문서: {}개",
                    createDTO.getProjectIdx(),
                    receiptFiles  != null ? receiptFiles.length  : 0,
                    documentFiles != null ? documentFiles.length : 0);

            ReceiptTripMeetingResponseDTO result = receiptTripMeetingService.createReceiptTripMeeting(
                    createDTO, receiptFiles, documentFiles, currentUserIdx);

            return ResponseEntity.status(HttpStatus.CREATED).body(result);

        } catch (Exception e) {
            log.error("회의+출장 통합 저장 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
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
