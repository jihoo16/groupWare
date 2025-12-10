package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.service.WeeklyReportService;
import com.pinecni.erp.entity.WeeklyReport;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 주간업무보고 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/document/weekly-report")
@RequiredArgsConstructor
public class WeeklyReportController {

    private final WeeklyReportService weeklyReportService;

    /**
     * 주간업무보고 생성
     * POST /api/document/weekly-report
     */
    @PostMapping
    public ResponseEntity<WeeklyReport> createWeeklyReport(@Valid @RequestBody WeeklyReport weeklyReport) {
        log.debug("POST /api/document/weekly-report");

        WeeklyReport created = weeklyReportService.createWeeklyReport(weeklyReport);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * 전체 주간업무보고 목록 조회
     * GET /api/document/weekly-report
     */
    @GetMapping
    public ResponseEntity<java.util.List<WeeklyReport>> getAllWeeklyReports() {
        log.debug("GET /api/document/weekly-report");

        java.util.List<WeeklyReport> reports = weeklyReportService.getAllWeeklyReport();
        return ResponseEntity.ok(reports);
    }

    /**
     * 주간업무보고 상세 조회
     * GET /api/document/weekly-report/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WeeklyReport> getWeeklyReportById(@PathVariable Long id) {
        log.debug("GET /api/document/weekly-report/{}", id);

        WeeklyReport report = weeklyReportService.getWeeklyReportById(id);
        return ResponseEntity.ok(report);
    }

}
