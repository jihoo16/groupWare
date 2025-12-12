package com.pinecni.erp.api.vacation.controller;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.service.VacationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

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
     * @param userIdx 사용자 IDX (현재는 1로 고정)
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
}
