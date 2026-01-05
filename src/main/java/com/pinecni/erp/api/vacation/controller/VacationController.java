package com.pinecni.erp.api.vacation.controller;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.dto.VacationCalculationDetailDTO;
import com.pinecni.erp.api.vacation.dto.VacationRequestSaveDTO;
import com.pinecni.erp.api.vacation.service.VacationService;
import com.pinecni.erp.entity.VacationBalance;
import com.pinecni.erp.entity.VacationRequest;
import com.pinecni.erp.entity.VacationAccrualSchedule;
import com.pinecni.erp.api.vacation.repository.VacationRequestRepository;
import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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
            log.error("연차 신청서 저장 실패: {}", e.getMessage(), e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(errorResponse);
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
}
