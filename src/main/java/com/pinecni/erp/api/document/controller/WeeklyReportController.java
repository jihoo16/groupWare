package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.service.WeeklyReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<WeeklyReportDTO> createWeeklyReport(@Valid @RequestBody WeeklyReportCreateDTO createDTO) {
        log.debug("POST /api/document/weekly-report");

        WeeklyReportDTO created = weeklyReportService.createWeeklyReport(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * 전체 주간업무보고 목록 조회
     * GET /api/document/weekly-report
     */
    @GetMapping
    public ResponseEntity<List<WeeklyReportDTO>> getAllWeeklyReports() {
        log.debug("GET /api/document/weekly-report");

        List<WeeklyReportDTO> reports = weeklyReportService.getAllWeeklyReport();
        return ResponseEntity.ok(reports);
    }

    /**
     * 주간업무보고 상세 조회
     * GET /api/document/weekly-report/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WeeklyReportDTO> getWeeklyReportById(@PathVariable Long id) {
        log.debug("GET /api/document/weekly-report/{}", id);

        WeeklyReportDTO report = weeklyReportService.getWeeklyReportById(id);
        return ResponseEntity.ok(report);
    }

    /**
     * 주간업무보고 수정
     * PUT /api/document/weekly-report/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<WeeklyReportDTO> updateWeeklyReport(
            @PathVariable Long id,
            @Valid @RequestBody WeeklyReportUpdateDTO updateDTO) {
        log.debug("PUT /api/document/weekly-report/{}", id);

        // TODO: 실제로는 로그인한 사용자 IDX를 가져와야 함
        Long updatedUserIdx = 1L;

        WeeklyReportDTO updated = weeklyReportService.updateWeeklyReport(id, updateDTO, updatedUserIdx);
        return ResponseEntity.ok(updated);
    }


}
