package com.pinecni.erp.api.competency.controller;

import com.pinecni.erp.api.competency.dto.*;
import com.pinecni.erp.api.competency.service.CompetencyService;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/competency")
@RequiredArgsConstructor
public class CompetencyController {

    private final CompetencyService competencyService;

    // =========================================================
    // 세션 검증 헬퍼
    // =========================================================

    private Long getSessionUserIdx(HttpSession session) {
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return userIdx;
    }

    // =========================================================
    // 학력 (user_school)
    // =========================================================

    /** GET /api/competency/schools?userIdx={userIdx} */
    @GetMapping("/schools")
    public ResponseEntity<List<UserSchoolDTO>> getSchools(
            @RequestParam Long userIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/schools?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getSchools(userIdx, requestingUserIdx));
    }

    /** POST /api/competency/schools */
    @PostMapping("/schools")
    public ResponseEntity<UserSchoolDTO> createSchool(
            @RequestParam Long userIdx,
            @RequestBody UserSchoolRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/schools - userIdx={}, requesting={}", userIdx, requestingUserIdx);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competencyService.createSchool(userIdx, dto, requestingUserIdx));
    }

    /** PUT /api/competency/schools/{idx} */
    @PutMapping("/schools/{idx}")
    public ResponseEntity<UserSchoolDTO> updateSchool(
            @PathVariable Long idx,
            @RequestBody UserSchoolRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("PUT /api/competency/schools/{} - requesting={}", idx, requestingUserIdx);
        return ResponseEntity.ok(competencyService.updateSchool(idx, dto, requestingUserIdx));
    }

    /** DELETE /api/competency/schools/{idx} */
    @DeleteMapping("/schools/{idx}")
    public ResponseEntity<Map<String, String>> deleteSchool(
            @PathVariable Long idx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/schools/{} - requesting={}", idx, requestingUserIdx);
        competencyService.deleteSchool(idx, requestingUserIdx);
        return ResponseEntity.ok(Map.of("message", "학력이 삭제되었습니다."));
    }

    // =========================================================
    // 자격증 (user_certificate)
    // =========================================================

    /** GET /api/competency/certificates?userIdx={userIdx} */
    @GetMapping("/certificates")
    public ResponseEntity<List<UserCertificateDTO>> getCertificates(
            @RequestParam Long userIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/certificates?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getCertificates(userIdx, requestingUserIdx));
    }

    /** POST /api/competency/certificates */
    @PostMapping("/certificates")
    public ResponseEntity<UserCertificateDTO> createCertificate(
            @RequestParam Long userIdx,
            @RequestBody UserCertificateRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/certificates - userIdx={}, requesting={}", userIdx, requestingUserIdx);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competencyService.createCertificate(userIdx, dto, requestingUserIdx));
    }

    /** PUT /api/competency/certificates/{idx} */
    @PutMapping("/certificates/{idx}")
    public ResponseEntity<UserCertificateDTO> updateCertificate(
            @PathVariable Long idx,
            @RequestBody UserCertificateRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("PUT /api/competency/certificates/{} - requesting={}", idx, requestingUserIdx);
        return ResponseEntity.ok(competencyService.updateCertificate(idx, dto, requestingUserIdx));
    }

    /** DELETE /api/competency/certificates/{idx} */
    @DeleteMapping("/certificates/{idx}")
    public ResponseEntity<Map<String, String>> deleteCertificate(
            @PathVariable Long idx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/certificates/{} - requesting={}", idx, requestingUserIdx);
        competencyService.deleteCertificate(idx, requestingUserIdx);
        return ResponseEntity.ok(Map.of("message", "자격증이 삭제되었습니다."));
    }

    // =========================================================
    // 경력 (user_career)
    // =========================================================

    /** GET /api/competency/careers?userIdx={userIdx} */
    @GetMapping("/careers")
    public ResponseEntity<List<UserCareerDTO>> getCareers(
            @RequestParam Long userIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/careers?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getCareers(userIdx, requestingUserIdx));
    }

    /** POST /api/competency/careers */
    @PostMapping("/careers")
    public ResponseEntity<UserCareerDTO> createCareer(
            @RequestParam Long userIdx,
            @RequestBody UserCareerRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/careers - userIdx={}, requesting={}", userIdx, requestingUserIdx);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competencyService.createCareer(userIdx, dto, requestingUserIdx));
    }

    /** PUT /api/competency/careers/{idx} */
    @PutMapping("/careers/{idx}")
    public ResponseEntity<UserCareerDTO> updateCareer(
            @PathVariable Long idx,
            @RequestBody UserCareerRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("PUT /api/competency/careers/{} - requesting={}", idx, requestingUserIdx);
        return ResponseEntity.ok(competencyService.updateCareer(idx, dto, requestingUserIdx));
    }

    /** DELETE /api/competency/careers/{idx} */
    @DeleteMapping("/careers/{idx}")
    public ResponseEntity<Map<String, String>> deleteCareer(
            @PathVariable Long idx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/careers/{} - requesting={}", idx, requestingUserIdx);
        competencyService.deleteCareer(idx, requestingUserIdx);
        return ResponseEntity.ok(Map.of("message", "경력이 삭제되었습니다."));
    }

    // =========================================================
    // 교육이수 (user_training)
    // =========================================================

    /** GET /api/competency/trainings?userIdx={userIdx} */
    @GetMapping("/trainings")
    public ResponseEntity<List<UserTrainingDTO>> getTrainings(
            @RequestParam Long userIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/trainings?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getTrainings(userIdx, requestingUserIdx));
    }

    /** POST /api/competency/trainings */
    @PostMapping("/trainings")
    public ResponseEntity<UserTrainingDTO> createTraining(
            @RequestParam Long userIdx,
            @RequestBody UserTrainingRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/trainings - userIdx={}, requesting={}", userIdx, requestingUserIdx);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competencyService.createTraining(userIdx, dto, requestingUserIdx));
    }

    /** PUT /api/competency/trainings/{idx} */
    @PutMapping("/trainings/{idx}")
    public ResponseEntity<UserTrainingDTO> updateTraining(
            @PathVariable Long idx,
            @RequestBody UserTrainingRequestDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("PUT /api/competency/trainings/{} - requesting={}", idx, requestingUserIdx);
        return ResponseEntity.ok(competencyService.updateTraining(idx, dto, requestingUserIdx));
    }

    /** DELETE /api/competency/trainings/{idx} */
    @DeleteMapping("/trainings/{idx}")
    public ResponseEntity<Map<String, String>> deleteTraining(
            @PathVariable Long idx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/trainings/{} - requesting={}", idx, requestingUserIdx);
        competencyService.deleteTraining(idx, requestingUserIdx);
        return ResponseEntity.ok(Map.of("message", "교육이수가 삭제되었습니다."));
    }

    // =========================================================
    // 병적사항 (본인 입력만 허용)
    // =========================================================

    /** GET /api/competency/military/{userIdx} */
    @GetMapping("/military/{userIdx}")
    public ResponseEntity<UserMilitaryServiceDTO> getMilitaryService(
            @PathVariable Long userIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/military/{} - requesting={}", userIdx, requestingUserIdx);
        return ResponseEntity.ok(competencyService.getMilitaryService(userIdx, requestingUserIdx));
    }

    /** PUT /api/competency/military/{userIdx} — 본인만 수정 가능 */
    @PutMapping("/military/{userIdx}")
    public ResponseEntity<UserMilitaryServiceDTO> updateMilitaryService(
            @PathVariable Long userIdx,
            @RequestBody UserMilitaryServiceDTO dto,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("PUT /api/competency/military/{} - requesting={}", userIdx, requestingUserIdx);
        return ResponseEntity.ok(competencyService.updateMilitaryService(userIdx, dto, requestingUserIdx));
    }

    // =========================================================
    // 학력/자격증 첨부파일
    // =========================================================

    /** POST /api/competency/schools/{schoolIdx}/attachments — 본인만 업로드 */
    @PostMapping("/schools/{schoolIdx}/attachments")
    public ResponseEntity<AttachmentSummaryDTO> uploadSchoolAttachment(
            @PathVariable Long schoolIdx,
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/schools/{}/attachments - by userIdx={}, file={}",
                schoolIdx, requestingUserIdx, file.getOriginalFilename());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competencyService.uploadSchoolAttachment(schoolIdx, file, requestingUserIdx));
    }

    /** DELETE /api/competency/schools/attachments/{attachmentIdx} — 본인만 삭제 */
    @DeleteMapping("/schools/attachments/{attachmentIdx}")
    public ResponseEntity<Map<String, String>> deleteSchoolAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/schools/attachments/{} - by userIdx={}", attachmentIdx, requestingUserIdx);
        competencyService.deleteSchoolAttachment(attachmentIdx, requestingUserIdx);
        return ResponseEntity.ok(Map.of("message", "첨부파일이 삭제되었습니다."));
    }

    /** GET /api/competency/schools/attachments/{attachmentIdx}/download — 본인 또는 역량열람자 이상 */
    @GetMapping("/schools/attachments/{attachmentIdx}/download")
    public ResponseEntity<org.springframework.core.io.Resource> downloadSchoolAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/schools/attachments/{}/download - by userIdx={}", attachmentIdx, requestingUserIdx);
        AttachmentDownloadDTO dto = competencyService.downloadSchoolAttachment(attachmentIdx, requestingUserIdx);
        return buildDownloadResponse(dto);
    }

    /** POST /api/competency/certificates/{certificateIdx}/attachments — 본인만 업로드 */
    @PostMapping("/certificates/{certificateIdx}/attachments")
    public ResponseEntity<AttachmentSummaryDTO> uploadCertificateAttachment(
            @PathVariable Long certificateIdx,
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/certificates/{}/attachments - by userIdx={}, file={}",
                certificateIdx, requestingUserIdx, file.getOriginalFilename());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(competencyService.uploadCertificateAttachment(certificateIdx, file, requestingUserIdx));
    }

    /** DELETE /api/competency/certificates/attachments/{attachmentIdx} — 본인만 삭제 */
    @DeleteMapping("/certificates/attachments/{attachmentIdx}")
    public ResponseEntity<Map<String, String>> deleteCertificateAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/certificates/attachments/{} - by userIdx={}", attachmentIdx, requestingUserIdx);
        competencyService.deleteCertificateAttachment(attachmentIdx, requestingUserIdx);
        return ResponseEntity.ok(Map.of("message", "첨부파일이 삭제되었습니다."));
    }

    /** GET /api/competency/certificates/attachments/{attachmentIdx}/download — 본인 또는 역량열람자 이상 */
    @GetMapping("/certificates/attachments/{attachmentIdx}/download")
    public ResponseEntity<org.springframework.core.io.Resource> downloadCertificateAttachment(
            @PathVariable Long attachmentIdx,
            HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/certificates/attachments/{}/download - by userIdx={}", attachmentIdx, requestingUserIdx);
        AttachmentDownloadDTO dto = competencyService.downloadCertificateAttachment(attachmentIdx, requestingUserIdx);
        return buildDownloadResponse(dto);
    }

    /** 다운로드 응답 헤더 빌더 — 한글 파일명 RFC 5987 인코딩 */
    private ResponseEntity<org.springframework.core.io.Resource> buildDownloadResponse(AttachmentDownloadDTO dto) {
        String encoded = URLEncoder.encode(dto.getOriginalFilename(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        String contentDisposition = "attachment; filename=\"" + encoded + "\"; filename*=UTF-8''" + encoded;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(dto.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .body(dto.getResource());
    }

    // =========================================================
    // 담당자(역량 열람자) 권한 관리 (관리자 전용)
    // =========================================================

    /** POST /api/competency/viewer-role/{userIdx} — C1104 → C1103 승격 */
    @PostMapping("/viewer-role/{userIdx}")
    public ResponseEntity<Map<String, String>> grantCompetencyViewerRole(
            @PathVariable Long userIdx,
            HttpSession session) {
        Long adminIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/viewer-role/{} - by adminIdx={}", userIdx, adminIdx);
        competencyService.grantCompetencyViewerRole(userIdx, adminIdx);
        return ResponseEntity.ok(Map.of("message", "역량 열람자 권한이 부여되었습니다."));
    }

    /** DELETE /api/competency/viewer-role/{userIdx} — C1103 → C1104 강등 */
    @DeleteMapping("/viewer-role/{userIdx}")
    public ResponseEntity<Map<String, String>> revokeCompetencyViewerRole(
            @PathVariable Long userIdx,
            HttpSession session) {
        Long adminIdx = getSessionUserIdx(session);
        log.debug("DELETE /api/competency/viewer-role/{} - by adminIdx={}", userIdx, adminIdx);
        competencyService.revokeCompetencyViewerRole(userIdx, adminIdx);
        return ResponseEntity.ok(Map.of("message", "역량 열람자 권한이 해제되었습니다."));
    }

    // =========================================================
    // 역량관리 열람 페이지용
    // =========================================================

    /** GET /api/competency/overview — 직원 역량 요약 목록 */
    @GetMapping("/overview")
    public ResponseEntity<List<UserCompetencyOverviewDTO>> getCompetencyOverview(HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/overview - by userIdx={}", requestingUserIdx);
        return ResponseEntity.ok(competencyService.getCompetencyOverview(requestingUserIdx));
    }

    /** GET /api/competency/export-data — 엑셀 export용 통합 데이터 */
    @GetMapping("/export-data")
    public ResponseEntity<CompetencyExportDataDTO> getCompetencyExportData(HttpSession session) {
        Long requestingUserIdx = getSessionUserIdx(session);
        log.debug("GET /api/competency/export-data - by userIdx={}", requestingUserIdx);
        return ResponseEntity.ok(competencyService.getCompetencyExportData(requestingUserIdx));
    }

    // =========================================================
    // 법정교육 일괄 등록 (관리자 전용)
    // =========================================================

    /** POST /api/competency/trainings/bulk — 법정교육 일괄 등록 */
    @PostMapping("/trainings/bulk")
    public ResponseEntity<BulkTrainingResultDTO> bulkCreateTraining(
            @Valid @RequestBody BulkTrainingRequestDTO dto,
            HttpSession session) {
        Long adminIdx = getSessionUserIdx(session);
        log.debug("POST /api/competency/trainings/bulk - by adminIdx={}, targetCount={}",
                adminIdx, dto.getTargetUserIdxList().size());
        return ResponseEntity.ok(competencyService.bulkCreateTraining(dto, adminIdx));
    }

    // =========================================================
    // 예외 핸들러
    // =========================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("error", e.getReason() != null ? e.getReason() : e.getMessage()));
    }
}
