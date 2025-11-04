package com.pinecni.erp.api.calendar.controller;

import com.pinecni.erp.api.calendar.dto.HolidayDto;
import com.pinecni.erp.api.calendar.service.HolidayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 공휴일 REST API Controller
 */
@RestController
@RequestMapping("/api/calendar/holidays")
@RequiredArgsConstructor
@Slf4j
public class HolidayController {

    private final HolidayService holidayService;

    /**
     * 특정 년도의 공휴일 조회
     * GET /api/calendar/holidays/year/{year}
     */
    @GetMapping("/year/{year}")
    public ResponseEntity<Map<String, Object>> getHolidaysByYear(@PathVariable Integer year) {
        log.info("공휴일 조회 요청: year={}", year);

        try {
            List<HolidayDto> holidays = holidayService.getHolidaysByYear(year);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("year", year);
            response.put("count", holidays.size());
            response.put("holidays", holidays);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("공휴일 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "공휴일 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 기간 내 공휴일 조회
     * GET /api/calendar/holidays/range?startDate=2025-01-01&endDate=2025-12-31
     */
    @GetMapping("/range")
    public ResponseEntity<Map<String, Object>> getHolidaysByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.info("기간 내 공휴일 조회 요청: startDate={}, endDate={}", startDate, endDate);

        try {
            List<HolidayDto> holidays = holidayService.getHolidaysByDateRange(startDate, endDate);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("startDate", startDate);
            response.put("endDate", endDate);
            response.put("count", holidays.size());
            response.put("holidays", holidays);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("기간 내 공휴일 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "공휴일 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 특정 날짜가 공휴일인지 확인
     * GET /api/calendar/holidays/check?date=2025-01-01
     */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkHoliday(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        log.info("공휴일 확인 요청: date={}", date);

        try {
            boolean isHoliday = holidayService.isHoliday(date);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("date", date);
            response.put("isHoliday", isHoliday);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("공휴일 확인 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "공휴일 확인 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 공휴일 데이터 업데이트 (공공데이터포털 API에서 가져오기)
     * POST /api/calendar/holidays/fetch/{year}
     */
    @PostMapping("/fetch/{year}")
    public ResponseEntity<Map<String, Object>> fetchHolidays(@PathVariable Integer year) {
        log.info("공휴일 데이터 가져오기 요청: year={}", year);

        try {
            List<HolidayDto> holidays = holidayService.fetchAndSaveHolidays(year);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("year", year);
            response.put("count", holidays.size());
            response.put("message", String.format("%d년 공휴일 데이터가 업데이트되었습니다.", year));
            response.put("holidays", holidays);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("공휴일 데이터 가져오기 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "공휴일 데이터 가져오기 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 현재 년도 공휴일 조회
     * GET /api/calendar/holidays/current
     */
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentYearHolidays() {
        Integer currentYear = LocalDate.now().getYear();
        return getHolidaysByYear(currentYear);
    }
}
