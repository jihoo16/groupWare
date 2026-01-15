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
        log.debug("POST /api/document/weekly-report - createWeeklyReport()");

        WeeklyReportDTO created = weeklyReportService.createWeeklyReport(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * 전체 주간업무보고 목록 조회는 ApprovalDocumentController의 /api/approval/documents를 사용하세요.
     * 이 엔드포인트는 더 이상 사용되지 않습니다.
     */
    // @GetMapping - 삭제됨 (ApprovalDocumentController로 대체)

    /**
     * 주간업무보고 상세 조회
     * GET /api/document/weekly-report/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WeeklyReportDTO> getWeeklyReportById(@PathVariable Long id) {
        log.debug("GET /api/document/weekly-report/{} - getWeeklyReportById()", id);

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
            @Valid @RequestBody WeeklyReportUpdateDTO updateDTO,
            jakarta.servlet.http.HttpSession session) {
        log.debug("PUT /api/document/weekly-report/{} - updateWeeklyReport()", id);

        // 세션에서 로그인한 사용자 IDX 가져오기
        Long updatedUserIdx = (Long) session.getAttribute("userIdx");
        if (updatedUserIdx == null) {
            updatedUserIdx = 1L; // 기본값 (로그인 안된 경우)
        }

        log.debug("Updated by userIdx: {}", updatedUserIdx);

        WeeklyReportDTO updated = weeklyReportService.updateWeeklyReport(id, updateDTO, updatedUserIdx);
        return ResponseEntity.ok(updated);
    }

    /**
     * 주간업무보고 삭제
     * DELETE /api/document/weekly-report/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWeeklyReport(@PathVariable Long id) {
        log.debug("DELETE /api/document/weekly-report/{} - deleteWeeklyReport()", id);

        weeklyReportService.deleteWeeklyReport(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 프로젝트별 주간업무보고 목록 조회
     * GET /api/document/weekly-report/project/{projectIdx}
     */
    @GetMapping("/project/{projectIdx}")
    public ResponseEntity<List<WeeklyReportDTO>> getWeeklyReportsByProject(@PathVariable Long projectIdx) {
        log.debug("GET /api/document/weekly-report/project/{} - getWeeklyReportsByProject()", projectIdx);

        List<WeeklyReportDTO> reports = weeklyReportService.getWeeklyReportsByProjectIdx(projectIdx);
        return ResponseEntity.ok(reports);
    }

}
