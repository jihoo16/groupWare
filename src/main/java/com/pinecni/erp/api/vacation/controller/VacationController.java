package com.pinecni.erp.api.vacation.controller;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.service.VacationService;
import com.pinecni.erp.entity.VacationBalance;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Vacation REST API Controller
 */
@RestController
@RequestMapping("/api/vacation")
@RequiredArgsConstructor
@Slf4j
public class VacationController {

    private final VacationService vacationService;

    /**
     * 연차 신청서용 사용자 정보 조회 API
     * @param userIdx 사용자 IDX
     * @return 사용자 정보 + 연차 잔액 정보
     */
    @GetMapping("/user-info")
    public ResponseEntity<VacationUserInfoDTO> getUserVacationInfo(
            @RequestParam(defaultValue = "1") Long userIdx) {

        Integer currentYear = LocalDate.now().getYear();
        log.info("getUserVacationInfo - userIdx: {}, year: {}", userIdx, currentYear);

        VacationUserInfoDTO userInfo = vacationService.getUserVacationInfo(userIdx, currentYear);

        return ResponseEntity.ok(userInfo);
    }

    /**
     * 특정 사용자의 연차 계산 및 저장 API
     * @param userIdx 사용자 IDX
     * @param year 대상 연도 (선택, 기본값: 현재 연도)
     * @return 계산된 연차 정보
     */
    @PostMapping("/calculate")
    public ResponseEntity<VacationBalance> calculateVacationBalance(
            @RequestParam Long userIdx,
            @RequestParam(required = false) Integer year) {

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("POST /api/vacation/calculate - userIdx: {}, year: {}", userIdx, year);

        VacationBalance balance = vacationService.calculateAndSaveVacationBalance(userIdx, year);

        return ResponseEntity.ok(balance);
    }

    /**
     * 전체 사용자의 연차 계산 및 저장 API
     * @param year 대상 연도 (선택, 기본값: 현재 연도)
     * @return 처리 결과
     */
    @PostMapping("/calculate-all")
    public ResponseEntity<Map<String, Object>> calculateAllVacationBalances(
            @RequestParam(required = false) Integer year) {

        if (year == null) {
            year = LocalDate.now().getYear();
        }

        log.info("POST /api/vacation/calculate-all - year: {}", year);

        int processedCount = vacationService.calculateAndSaveAllVacationBalances(year);

        Map<String, Object> response = new HashMap<>();
        response.put("year", year);
        response.put("processedCount", processedCount);
        response.put("message", processedCount + "명의 연차가 계산되었습니다.");

        return ResponseEntity.ok(response);
    }
}
