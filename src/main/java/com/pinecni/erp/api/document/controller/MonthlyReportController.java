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

