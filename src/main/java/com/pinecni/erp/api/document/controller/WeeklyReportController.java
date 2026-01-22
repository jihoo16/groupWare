package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.repository.WeeklyReportOfficialPdfRepository;
import com.pinecni.erp.api.document.service.WeeklyReportService;
import com.pinecni.erp.entity.WeeklyReportOfficialPdf;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    private final WeeklyReportOfficialPdfRepository weeklyReportOfficialPdfRepository;

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
     * documentIdx로 주간업무보고 공식 PDF 목록 조회
     * GET /api/document/weekly-report/official-pdf/{documentIdx}
     */
    @GetMapping("/official-pdf/{documentIdx}")
    public ResponseEntity<List<WeeklyReportOfficialPdf>> getOfficialPdfsByDocumentIdx(@PathVariable Long documentIdx) {
        log.info("[주간업무보고 공식 PDF 목록 조회] documentIdx: {}", documentIdx);

        List<WeeklyReportOfficialPdf> pdfList = weeklyReportOfficialPdfRepository.findAllByDocumentIdx(documentIdx);
        return ResponseEntity.ok(pdfList);
    }

    /**
     * 주간업무보고 공식 PDF 다운로드
     * GET /api/document/weekly-report/download/{fileIdx}
     * @param fileIdx WeeklyReportOfficialPdf의 idx
     * @return PDF 파일
     */
    @GetMapping("/download/{fileIdx}")
    public ResponseEntity<Resource> downloadOfficialPdf(@PathVariable Long fileIdx) {
        try {
            log.info("[주간업무보고 공식 PDF 다운로드] fileIdx: {}", fileIdx);

            // 파일 정보 조회
            WeeklyReportOfficialPdf file = weeklyReportOfficialPdfRepository.findById(fileIdx)
                    .orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없습니다. fileIdx: " + fileIdx));

            // 파일 경로에서 파일 읽기
            java.nio.file.Path filePath = java.nio.file.Paths.get(file.getFilePath());

            if (!java.nio.file.Files.exists(filePath)) {
                log.error("[파일 없음] filePath: {}", file.getFilePath());
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = java.nio.file.Files.readAllBytes(filePath);
            ByteArrayResource resource = new ByteArrayResource(fileContent);

            // Content-Disposition 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION,
                       "attachment; filename=\"" + new String(file.getFileName().getBytes("UTF-8"), "ISO-8859-1") + "\"");
            headers.setContentType(MediaType.APPLICATION_PDF);

            log.info("[공식 PDF 다운로드 성공] fileName: {}, size: {} bytes", file.getFileName(), fileContent.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(fileContent.length)
                    .body(resource);

        } catch (IllegalArgumentException e) {
            log.error("[공식 PDF 다운로드 실패 - 파일 없음] fileIdx: {}, error: {}", fileIdx, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("[공식 PDF 다운로드 실패] fileIdx: {}, error: {}", fileIdx, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

}
