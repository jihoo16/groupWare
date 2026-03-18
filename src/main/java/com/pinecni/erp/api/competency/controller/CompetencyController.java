package com.pinecni.erp.api.competency.controller;

import com.pinecni.erp.api.competency.dto.*;
import com.pinecni.erp.api.competency.service.CompetencyService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
        getSessionUserIdx(session); // 로그인 확인
        log.debug("GET /api/competency/schools?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getSchools(userIdx));
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
        getSessionUserIdx(session);
        log.debug("GET /api/competency/certificates?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getCertificates(userIdx));
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
        getSessionUserIdx(session);
        log.debug("GET /api/competency/careers?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getCareers(userIdx));
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
        getSessionUserIdx(session);
        log.debug("GET /api/competency/trainings?userIdx={}", userIdx);
        return ResponseEntity.ok(competencyService.getTrainings(userIdx));
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
    // 예외 핸들러
    // =========================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("error", e.getReason() != null ? e.getReason() : e.getMessage()));
    }
}
