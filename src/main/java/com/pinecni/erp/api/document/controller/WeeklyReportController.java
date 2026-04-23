package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.service.WeeklyReportService;
import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 주간업무보고 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/document/weekly-report")
@RequiredArgsConstructor
public class WeeklyReportController {

    private final WeeklyReportService weeklyReportService;
    private final ProjectMemberRepository projectMemberRepository;

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
    public ResponseEntity<?> updateWeeklyReport(
            @PathVariable Long id,
            @Valid @RequestBody WeeklyReportUpdateDTO updateDTO,
            jakarta.servlet.http.HttpSession session) {
        log.debug("PUT /api/document/weekly-report/{} - updateWeeklyReport()", id);

        Long updatedUserIdx = (Long) session.getAttribute("userIdx");
        if (updatedUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "로그인이 필요합니다."));
        }

        // 프로젝트 멤버 여부 확인
        if (updateDTO.getProjectIdx() != null) {
            boolean isMember = projectMemberRepository.existsByProjectIdxAndEmployeeIdx(
                    updateDTO.getProjectIdx(), updatedUserIdx);
            if (!isMember) {
                log.warn("주간보고 수정 권한 없음 - reportId: {}, userIdx: {}", id, updatedUserIdx);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "프로젝트 멤버만 수정할 수 있습니다."));
            }
        }

        log.debug("Updated by userIdx: {}", updatedUserIdx);

        try {
            WeeklyReportDTO updated = weeklyReportService.updateWeeklyReport(id, updateDTO, updatedUserIdx);
            return ResponseEntity.ok(updated);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }
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

    /**
     * documentIdx로 주간업무보고 상세 조회
     * GET /api/document/weekly-report/by-document/{documentIdx}
     */
    @GetMapping("/by-document/{documentIdx}")
    public ResponseEntity<WeeklyReportDTO> getWeeklyReportByDocumentIdx(@PathVariable Long documentIdx) {
        log.debug("GET /api/document/weekly-report/by-document/{} - getWeeklyReportByDocumentIdx()", documentIdx);

        WeeklyReportDTO report = weeklyReportService.getWeeklyReportByDocumentIdx(documentIdx);
        return ResponseEntity.ok(report);
    }

    /**
     * documentIdx로 주간업무보고 삭제
     * DELETE /api/document/weekly-report/by-document/{documentIdx}
     */
    @DeleteMapping("/by-document/{documentIdx}")
    public ResponseEntity<Void> deleteWeeklyReportByDocumentIdx(@PathVariable Long documentIdx) {
        log.debug("DELETE /api/document/weekly-report/by-document/{} - deleteWeeklyReportByDocumentIdx()", documentIdx);

        weeklyReportService.deleteWeeklyReportByDocumentIdx(documentIdx);
        return ResponseEntity.noContent().build();
    }

    /**
     * 이전 주 주간업무보고 조회 (지난주 차주계획 불러오기용)
     * GET /api/document/weekly-report/project/{projectIdx}/prev-week?weekStart=YYYY.MM.DD
     */
    @GetMapping("/project/{projectIdx}/prev-week")
    public ResponseEntity<WeeklyReportDTO> getPrevWeekReport(
            @PathVariable Long projectIdx,
            @RequestParam String weekStart) {
        log.debug("GET /api/document/weekly-report/project/{}/prev-week?weekStart={}", projectIdx, weekStart);

        WeeklyReportDTO report = weeklyReportService.getPrevWeekReport(projectIdx, weekStart);

        if (report == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(report);
    }

}
