package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.ReceiptTripCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripUpdateDTO;
import com.pinecni.erp.api.document.service.ReceiptTripService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 출장 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-trips")
@RequiredArgsConstructor
public class ReceiptTripController {

    private final ReceiptTripService receiptTripService;

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
            ReceiptTripDTO receiptTrip = receiptTripService.getReceiptTripById(idx);
            return ResponseEntity.ok(receiptTrip);
        } catch (IllegalArgumentException e) {
            log.error("출장 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 출장 생성
     * POST /api/receipt-trips
     */
    @PostMapping
    public ResponseEntity<?> createReceiptTrip(
            @RequestBody ReceiptTripCreateDTO createDTO,
            jakarta.servlet.http.HttpSession session) {

        // 세션에서 현재 로그인한 사용자 정보 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        String currentUserName = (String) session.getAttribute("empName");

        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 작성자 정보 자동 설정
        createDTO.setAuthorIdx(currentUserIdx);

        log.debug("POST /api/receipt-trips - projectIdx: {}, authorIdx: {}, authorName: {}",
                createDTO.getProjectIdx(), currentUserIdx, currentUserName);

        try {
            ReceiptTripDTO receiptTrip = receiptTripService.createReceiptTrip(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(receiptTrip);
        } catch (Exception e) {
            log.error("출장 생성 실패: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 출장 수정
     * PUT /api/receipt-trips/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ReceiptTripDTO> updateReceiptTrip(
            @PathVariable Long idx,
            @RequestBody ReceiptTripUpdateDTO updateDTO) {
        log.debug("PUT /api/receipt-trips/{}", idx);

        try {
            ReceiptTripDTO receiptTrip = receiptTripService.updateReceiptTrip(idx, updateDTO);
            return ResponseEntity.ok(receiptTrip);
        } catch (IllegalArgumentException e) {
            log.error("출장 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("출장 수정 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 출장 삭제
     * DELETE /api/receipt-trips/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteReceiptTrip(@PathVariable Long idx) {
        log.debug("DELETE /api/receipt-trips/{}", idx);

        try {
            receiptTripService.deleteReceiptTrip(idx);

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
