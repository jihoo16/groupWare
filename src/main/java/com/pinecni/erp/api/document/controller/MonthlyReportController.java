package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.MonthlyReportCreateDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportUpdateDTO;
import com.pinecni.erp.api.document.service.MonthlyReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 월간업무보고 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/document/monthly-report")
@RequiredArgsConstructor
public class MonthlyReportController {

    private final MonthlyReportService monthlyReportService;

    /**
     * 월간업무보고 생성
     * POST /api/document/monthly-report
     */
    @PostMapping
    public ResponseEntity<MonthlyReportDTO> createMonthlyReport(@Valid @RequestBody MonthlyReportCreateDTO createDTO) {
        log.debug("POST /api/document/monthly-report");

        MonthlyReportDTO created = monthlyReportService.createMonthlyReport(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * 전체 월간업무보고 목록 조회
     * GET /api/document/monthly-report
     */
    @GetMapping
    public ResponseEntity<List<MonthlyReportDTO>> getAllMonthlyReports() {
        log.debug("GET /api/document/monthly-report");

        List<MonthlyReportDTO> reports = monthlyReportService.getAllMonthlyReport();
        return ResponseEntity.ok(reports);
    }

    /**
     * 월간업무보고 상세 조회
     * GET /api/document/monthly-report/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<MonthlyReportDTO> getMonthlyReportById(@PathVariable Long id) {
        log.debug("GET /api/document/monthly-report/{}", id);

        MonthlyReportDTO report = monthlyReportService.getMonthlyReportById(id);
        return ResponseEntity.ok(report);
    }

    /**
     * 월간업무보고 수정
     * PUT /api/document/monthly-report/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<MonthlyReportDTO> updateMonthlyReport(
            @PathVariable Long id,
            @Valid @RequestBody MonthlyReportUpdateDTO updateDTO) {
        log.debug("PUT /api/document/monthly-report/{}", id);

        // TODO: 실제로는 로그인한 사용자 IDX를 가져와야 함
        Long updatedUserIdx = 1L;

        MonthlyReportDTO updated = monthlyReportService.updateMonthlyReport(id, updateDTO, updatedUserIdx);
        return ResponseEntity.ok(updated);
    }

    /**
     * 월간업무보고 삭제
     * DELETE /api/document/monthly-report/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMonthlyReport(@PathVariable Long id) {
        log.debug("DELETE /api/document/monthly-report/{}", id);

        monthlyReportService.deleteMonthlyReport(id);
        return ResponseEntity.noContent().build();
    }

}
