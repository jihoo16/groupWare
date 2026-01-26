package com.pinecni.erp.api.vacation.controller;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.dto.VacationCalculationDetailDTO;
import com.pinecni.erp.api.vacation.dto.VacationRequestSaveDTO;
import com.pinecni.erp.api.vacation.dto.VacationDetailDTO;
import com.pinecni.erp.api.vacation.service.VacationService;
import com.pinecni.erp.entity.VacationBalance;
import com.pinecni.erp.entity.VacationRequest;
import com.pinecni.erp.entity.VacationAccrualSchedule;
import com.pinecni.erp.api.vacation.repository.VacationRequestRepository;
import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.repository.VacationOfficialPdfRepository;
import com.pinecni.erp.service.PdfGenerationService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Vacation REST API Controller
 */
@RestController
@RequestMapping("/api/vacation")
@RequiredArgsConstructor
@Slf4j
public class VacationController {

    private final VacationService vacationService;
    private final VacationRequestRepository vacationRequestRepository;
    private final VacationAccrualScheduleRepository vacationAccrualScheduleRepository;
    private final VacationOfficialPdfRepository vacationOfficialPdfRepository;
    private final PdfGenerationService pdfGenerationService;

    /**
     * 연차 신청서용 사용자 정보 조회 API
     * @param userIdx 사용자 IDX (선택, 기본값: 세션의 로그인 사용자)
     * @param year 조회할 연도 (선택, 기본값: 현재 연도)
     * @param session HTTP 세션
     * @return 사용자 정보 + 연차 잔액 정보
     */
    @GetMapping("/user-info")
    public ResponseEntity<VacationUserInfoDTO> getUserVacationInfo(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) Integer year,
            HttpSession session) {

        // 세션에서 로그인 사용자 IDX 조회
        if (userIdx == null) {
            userIdx = (Long) session.getAttribute("userIdx");
            if (userIdx == null) {
                log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
                return ResponseEntity.status(401).build();
            }
        }

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("getUserVacationInfo - userIdx: {}, year: {}", userIdx, year);

        VacationUserInfoDTO userInfo = vacationService.getUserVacationInfo(userIdx, year);

        return ResponseEntity.ok(userInfo);
    }

    /**
     * 특정 사용자의 연차 발생 일정 생성 API
     * @param userIdx 사용자 IDX
     * @param year 대상 연도 (선택, 기본값: 현재 연도)
     * @param session HTTP 세션
     * @return 성공 메시지
     */
    @PostMapping("/generate-schedule")
    public ResponseEntity<Map<String, Object>> generateVacationSchedule(
            @RequestParam Long userIdx,
            @RequestParam(required = false) Integer year,
            HttpSession session) {

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        // 세션에서 현재 로그인한 사용자 IDX 조회
        Long operatorUserIdx = (Long) session.getAttribute("userIdx");
        if (operatorUserIdx == null) {
            log.warn("세션에 userIdx가 없습니다. 기본값 사용");
            operatorUserIdx = userIdx;
        }

        log.info("POST /api/vacation/generate-schedule - userIdx: {}, year: {}, operatorUserIdx: {}",
                 userIdx, year, operatorUserIdx);

        vacationService.generateVacationAccrualSchedule(userIdx, year, operatorUserIdx);

        Map<String, Object> response = new HashMap<>();
        response.put("userIdx", userIdx);
        response.put("year", year);
        response.put("message", "연차 발생 일정이 생성되었습니다.");

        return ResponseEntity.ok(response);
    }

    /**
     * 전체 사용자의 연차 발생 일정 생성 API
     * @param year 대상 연도 (선택, 기본값: 현재 연도)
     * @return 처리 결과
     */
    @PostMapping("/generate-all-schedules")
    public ResponseEntity<Map<String, Object>> generateAllVacationSchedules(
            @RequestParam(required = false) Integer year) {

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("POST /api/vacation/generate-all-schedules - year: {}", year);

        int processedCount = vacationService.generateAllVacationAccrualSchedules(year);

        Map<String, Object> response = new HashMap<>();
        response.put("year", year);
        response.put("processedCount", processedCount);
        response.put("message", processedCount + "명의 연차 발생 일정이 생성되었습니다.");

        return ResponseEntity.ok(response);
    }

    /**
     * 사용자의 연차 사용 내역 조회 API
     * @param userIdx 사용자 IDX (선택, 기본값: 세션의 로그인 사용자)
     * @param year 조회할 연도 (선택, 기본값: 현재 연도)
     * @param session HTTP 세션
     * @return 연차 사용 내역 리스트
     */
    @GetMapping("/history")
    public ResponseEntity<List<VacationRequest>> getVacationHistory(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) Integer year,
            HttpSession session) {

        // 세션에서 로그인 사용자 IDX 조회
        if (userIdx == null) {
            userIdx = (Long) session.getAttribute("userIdx");
            if (userIdx == null) {
                log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
                return ResponseEntity.status(401).build();
            }
        }

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("GET /api/vacation/history - userIdx: {}, year: {}", userIdx, year);

        List<VacationRequest> history = vacationRequestRepository.findByUserIdxAndYear(userIdx, year);

        return ResponseEntity.ok(history);
    }

    /**
     * 연차 발생 일정 조회 API
     * @param userIdx 사용자 IDX (선택, 기본값: 세션의 로그인 사용자)
     * @param year 조회할 연도 (선택, 기본값: 현재 연도)
     * @param session HTTP 세션
     * @return 연차 발생 일정 리스트
     */
    @GetMapping("/accrual-schedule")
    public ResponseEntity<List<VacationAccrualSchedule>> getAccrualSchedule(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) Integer year,
            HttpSession session) {

        // 세션에서 로그인 사용자 IDX 조회
        if (userIdx == null) {
            userIdx = (Long) session.getAttribute("userIdx");
            if (userIdx == null) {
                log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
                return ResponseEntity.status(401).build();
            }
        }

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("GET /api/vacation/accrual-schedule - userIdx: {}, year: {}", userIdx, year);

        List<VacationAccrualSchedule> schedule = vacationAccrualScheduleRepository
                .findByUserIdxAndYearOrderByAccrualDateAsc(userIdx, year);

        return ResponseEntity.ok(schedule);
    }

    /**
     * 연차 계산 상세 정보 조회 API (총 연차 모달용)
     * - 입사일 기준으로 해당 연도의 예상 연차 계산
     * - 미래 연도도 계산 가능
     * @param userIdx 사용자 IDX (선택, 기본값: 세션의 로그인 사용자)
     * @param year 조회할 연도 (선택, 기본값: 현재 연도)
     * @param session HTTP 세션
     * @return 연차 계산 상세 정보
     */
    @GetMapping("/calculation-detail")
    public ResponseEntity<VacationCalculationDetailDTO> getCalculationDetail(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) Integer year,
            HttpSession session) {

        // 세션에서 로그인 사용자 IDX 조회
        if (userIdx == null) {
            userIdx = (Long) session.getAttribute("userIdx");
            if (userIdx == null) {
                log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
                return ResponseEntity.status(401).build();
            }
        }

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("GET /api/vacation/calculation-detail - userIdx: {}, year: {}", userIdx, year);

        try {
            VacationCalculationDetailDTO detail = vacationService.getVacationCalculationDetail(userIdx, year);
            return ResponseEntity.ok(detail);
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.error("연차 계산 상세 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 연차 신청서 저장 API
     * - approval_documents에 문서 메타데이터 저장
     * - vacation_request에 연차 상세 정보 저장 (여러 기간 개별 저장)
     * @param saveDTO 연차 신청 정보
     * @param session HTTP 세션
     * @return 생성된 문서 IDX
     */
    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> saveVacationRequest(
            @RequestBody VacationRequestSaveDTO saveDTO,
            HttpSession session) {

        // 세션에서 로그인 사용자 IDX 조회
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(401).build();
        }

        log.info("POST /api/vacation/request - userIdx: {}, periods: {}", userIdx, saveDTO.getPeriods().size());

        try {
            Long documentIdx = vacationService.saveVacationRequest(userIdx, saveDTO);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("documentIdx", documentIdx);
            response.put("message", "연차 신청서가 저장되었습니다.");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            // 비즈니스 검증 실패 (사용자에게 검증 메시지 전달)
            log.error("연차 신청서 저장 실패 - 검증 오류: {}", e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            // 시스템 에러 (DB 오류, PDF 생성 오류 등 - 기술적인 에러는 로그에만)
            log.error("연차 신청서 저장 실패 - 시스템 오류: {}", e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "연차 신청서 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.");

            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * 사용자의 신청된 연차 날짜 목록 조회 API (연차 신청 시 비활성화용)
     * @param userIdx 사용자 IDX (선택, 기본값: 세션의 로그인 사용자)
     * @param year 조회할 연도 (선택, 기본값: 현재 연도)
     * @param session HTTP 세션
     * @return 신청된 날짜 목록 (YYYY-MM-DD 형식)
     */
    @GetMapping("/requested-dates")
    public ResponseEntity<List<String>> getRequestedDates(
            @RequestParam(required = false) Long userIdx,
            @RequestParam(required = false) Integer year,
            HttpSession session) {

        // 세션에서 로그인 사용자 IDX 조회
        if (userIdx == null) {
            userIdx = (Long) session.getAttribute("userIdx");
            if (userIdx == null) {
                log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
                return ResponseEntity.status(401).build();
            }
        }

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("GET /api/vacation/requested-dates - userIdx: {}, year: {}", userIdx, year);

        // 해당 연도의 연차 신청 내역 조회
        List<VacationRequest> requests = vacationRequestRepository.findByUserIdxAndYear(userIdx, year);

        // 신청된 모든 날짜 수집
        Set<String> requestedDates = new HashSet<>();
        for (VacationRequest request : requests) {
            LocalDate currentDate = request.getStartDate();
            LocalDate endDate = request.getEndDate();

            while (!currentDate.isAfter(endDate)) {
                requestedDates.add(currentDate.toString()); // YYYY-MM-DD 형식
                currentDate = currentDate.plusDays(1);
            }
        }

        List<String> sortedDates = new ArrayList<>(requestedDates);
        Collections.sort(sortedDates);

        log.info("신청된 연차 날짜 수: {}", sortedDates.size());

        return ResponseEntity.ok(sortedDates);
    }

    /**
     * 연차신청서 PDF 생성 API
     * @param pdfData PDF 생성에 필요한 데이터
     * @param session HTTP 세션
     * @return PDF 파일 (application/pdf)
     */
    @PostMapping("/generate-pdf")
    public ResponseEntity<Resource> generateVacationPdf(
            @RequestBody Map<String, Object> pdfData,
            HttpSession session) {

        try {
            log.info("POST /api/vacation/generate-pdf - PDF 생성 시작");

            // 세션에서 로그인 사용자 IDX 조회
            Long userIdx = (Long) session.getAttribute("userIdx");
            if (userIdx == null) {
                log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
                return ResponseEntity.status(401).build();
            }

            // PDF 데이터 추출
            String userName = (String) pdfData.getOrDefault("userName", "");
            String userId = (String) pdfData.getOrDefault("userId", "");
            String userDept = (String) pdfData.getOrDefault("userDept", "");
            String userPosition = (String) pdfData.getOrDefault("userPosition", "");
            String reason = (String) pdfData.getOrDefault("reason", "");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> periods = (List<Map<String, Object>>) pdfData.getOrDefault("periods", new ArrayList<>());

            // PDF 생성 (Flying Saucer + iText 사용)
            byte[] pdfBytes = pdfGenerationService.generateVacationPdf(
                    userName, userDept, userPosition, reason, periods
            );

            // 휴가 기간 중 가장 첫날 찾기
            String firstVacationDate = periods.stream()
                    .map(p -> (String) p.get("startDate"))
                    .filter(date -> date != null && !date.isEmpty())
                    .sorted()
                    .findFirst()
                    .orElse(LocalDate.now().toString());

            // 날짜 포맷 변환 (YYYY-MM-DD -> YYYYMMDD)
            String datePrefix = firstVacationDate.replace("-", "");

            // 연도 추출 (YYYY-MM-DD -> YYYY)
            String year = firstVacationDate.substring(0, 4);

            // userId가 없으면 userIdx 사용
            String userIdentifier = (userId != null && !userId.isEmpty()) ? userId : String.valueOf(userIdx);

            // 파일명 생성: YYYYMMDD_vacation_request_{userId}.pdf
            String fileName = String.format("%s_vacation_request_%s.pdf", datePrefix, userIdentifier);

            // 서버의 정해진 경로에 PDF 파일 저장
            // 경로: C:\PDF_STORAGE\vacation\YYYY\{userId}\filename
            String savePath = pdfGenerationService.saveVacationPdf(pdfBytes, fileName, year, userIdentifier);
            log.info("PDF 파일 저장 완료: {}", savePath);

            // 브라우저로 PDF 다운로드
            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);

        } catch (Exception e) {
            log.error("PDF 생성 중 오류 발생", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 연차신청서 PDF 다운로드 API
     * @param fileIdx VacationOfficialPdf의 idx
     * @return PDF 파일
     */
    @GetMapping("/download/{fileIdx}")
    public ResponseEntity<Resource> downloadVacationPdf(@PathVariable Long fileIdx) {
        try {
            log.info("[연차신청서 PDF 다운로드] fileIdx: {}", fileIdx);

            // 파일 정보 조회
            com.pinecni.erp.entity.VacationOfficialPdf file = vacationOfficialPdfRepository.findById(fileIdx)
                    .orElseThrow(() -> new IllegalArgumentException("파일을 찾을 수 없습니다. fileIdx: " + fileIdx));

            // 파일 경로에서 파일 읽기
            java.nio.file.Path filePath = java.nio.file.Paths.get(file.getFilePath());
            if (!java.nio.file.Files.exists(filePath)) {
                log.error("파일이 존재하지 않습니다: {}", file.getFilePath());
                return ResponseEntity.notFound().build();
            }

            byte[] fileBytes = java.nio.file.Files.readAllBytes(filePath);
            ByteArrayResource resource = new ByteArrayResource(fileBytes);

            // 한글 파일명 인코딩 처리
            String encodedFileName = java.net.URLEncoder.encode(file.getFileName(), "UTF-8")
                    .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFileName)
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(fileBytes.length)
                    .body(resource);

        } catch (IllegalArgumentException e) {
            log.error("[PDF 다운로드 실패] fileIdx: {}, error: {}", fileIdx, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("[PDF 다운로드 실패] fileIdx: {}, error: {}", fileIdx, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 연차신청서 상세 조회 API
     * @param documentIdx ApprovalDocument의 idx
     * @return 연차신청서 상세 정보
     */
    @GetMapping("/detail")
    public ResponseEntity<?> getVacationDetail(@RequestParam Long documentIdx) {
        try {
            log.info("[연차신청서 상세 조회] documentIdx: {}", documentIdx);

            VacationDetailDTO detail = vacationService.getVacationDetail(documentIdx);

            return ResponseEntity.ok(detail);
        } catch (IllegalArgumentException e) {
            log.error("[연차신청서 상세 조회 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[연차신청서 상세 조회 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "문서 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 연차신청서 승인 API
     * @param documentIdx ApprovalDocument의 idx
     * @return 승인 결과
     */
    @PostMapping("/approve")
    public ResponseEntity<?> approveVacation(@RequestParam Long documentIdx, HttpSession session) {
        try {
            log.info("[연차신청서 승인] documentIdx: {}", documentIdx);

            // TODO: 세션에서 현재 사용자 정보 가져오기
            Long currentUserIdx = 1L; // 임시값

            vacationService.approveVacation(documentIdx, currentUserIdx);

            return ResponseEntity.ok(Map.of("message", "승인되었습니다."));
        } catch (UnsupportedOperationException e) {
            log.warn("[연차신청서 승인 미구현] documentIdx: {}, error: {}", documentIdx, e.getMessage());
            return ResponseEntity.status(501).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[연차신청서 승인 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "승인 처리 중 오류가 발생했습니다."));
        }
    }

    /**
     * 연차신청서 반려 API
     * @param documentIdx ApprovalDocument의 idx
     * @param request 반려 사유
     * @return 반려 결과
     */
    @PostMapping("/reject")
    public ResponseEntity<?> rejectVacation(@RequestParam Long documentIdx,
                                           @RequestBody Map<String, String> request,
                                           HttpSession session) {
        try {
            String reason = request.get("reason");
            log.info("[연차신청서 반려] documentIdx: {}, reason: {}", documentIdx, reason);

            // TODO: 세션에서 현재 사용자 정보 가져오기
            Long currentUserIdx = 1L; // 임시값

            vacationService.rejectVacation(documentIdx, currentUserIdx, reason);

            return ResponseEntity.ok(Map.of("message", "반려되었습니다."));
        } catch (UnsupportedOperationException e) {
            log.warn("[연차신청서 반려 미구현] documentIdx: {}, error: {}", documentIdx, e.getMessage());
            return ResponseEntity.status(501).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[연차신청서 반려 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "반려 처리 중 오류가 발생했습니다."));
        }
    }

    /**
     * 연차신청서 삭제 API (soft delete + 캘린더 일정 삭제)
     * @param documentIdx ApprovalDocument의 idx
     * @return 삭제 결과
     */
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteVacation(@RequestParam Long documentIdx, HttpSession session) {
        try {
            log.info("[연차신청서 삭제] documentIdx: {}", documentIdx);

            // TODO: 세션에서 현재 사용자 정보 가져오기
            Long currentUserIdx = 1L; // 임시값

            vacationService.deleteVacation(documentIdx, currentUserIdx);

            return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
        } catch (IllegalArgumentException e) {
            log.error("[연차신청서 삭제 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            log.error("[연차신청서 삭제 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[연차신청서 삭제 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "삭제 처리 중 오류가 발생했습니다."));
        }
    }
}
