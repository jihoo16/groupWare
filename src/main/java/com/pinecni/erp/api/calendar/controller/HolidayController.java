package com.pinecni.erp.api.calendar.controller;

import com.pinecni.erp.api.calendar.service.HolidayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * 공휴일 REST API Controller
 * Google Calendar API + Fallback 방식
 */
@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
@Slf4j
public class HolidayController {

    private final HolidayService holidayService;

    /**
     * 특정 년도 공휴일 조회
     * GET /api/holidays?year=2025
     *
     * 프론트엔드에서 사용하는 메인 API (년도별 동적 로딩)
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> getHolidays(
            @RequestParam(required = false) Integer year) {

        if (year != null) {
            log.info("{}년 공휴일 조회 요청", year);
            try {
                Map<String, String> holidays = holidayService.getHolidaysByYear(year);
                log.info("{}년 공휴일 {} 건 반환", year, holidays.size());
                return ResponseEntity.ok(holidays);
            } catch (Exception e) {
                log.error("{}년 공휴일 조회 실패: {}", year, e.getMessage(), e);
                return ResponseEntity.ok(new HashMap<>());
            }
        } else {
            // 년도 파라미터가 없으면 전체 조회 (하위 호환성)
            log.info("모든 공휴일 조회 요청");
            try {
                Map<String, String> holidays = holidayService.getAllHolidays();
                log.info("공휴일 {} 건 반환", holidays.size());
                return ResponseEntity.ok(holidays);
            } catch (Exception e) {
                log.error("공휴일 조회 실패: {}", e.getMessage(), e);
                return ResponseEntity.ok(new HashMap<>());
            }
        }
    }

    /**
     * 특정 날짜가 공휴일인지 확인
     * GET /api/holidays/check?date=2025-01-01
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkHoliday(
            @RequestParam String date) {

        log.info("공휴일 확인 요청: {}", date);

        try {
            LocalDate localDate = LocalDate.parse(date);
            boolean isHoliday = holidayService.isHoliday(localDate);
            String holidayName = holidayService.getHolidayName(localDate);

            Map<String, Object> response = new HashMap<>();
            response.put("date", date);
            response.put("isHoliday", isHoliday);
            response.put("holidayName", holidayName);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("공휴일 확인 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Invalid date format or processing error");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

}
