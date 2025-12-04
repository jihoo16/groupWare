package com.pinecni.erp.api.calendar.controller;

import com.pinecni.erp.api.calendar.dto.TeamFilterDto;
import com.pinecni.erp.api.calendar.service.CalendarEventService;
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
 * 캘린더 필터 REST API Controller
 */
@RestController
@RequestMapping("/api/calendar/filters")
@RequiredArgsConstructor
@Slf4j
public class CalendarFilterController {

    private final CalendarEventService calendarEventService;

    /**
     * 팀 목록 조회 (일정 개수 포함)
     * GET /api/calendar/filters/teams?startDate=2025-12-01&endDate=2025-12-31
     */
    @GetMapping("/teams")
    public ResponseEntity<List<TeamFilterDto>> getTeamsWithEventCount(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.info("팀 목록 조회 요청 (일정 개수 포함): startDate={}, endDate={}", startDate, endDate);

        try {
            List<TeamFilterDto> teams = calendarEventService.getTeamsWithEventCount(startDate, endDate);
            return ResponseEntity.ok(teams);
        } catch (Exception e) {
            log.error("팀 목록 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 일정 유형별 개수 조회
     * GET /api/calendar/filters/event-types/count?startDate=2025-12-01&endDate=2025-12-31
     */
    @GetMapping("/event-types/count")
    public ResponseEntity<Map<String, Long>> getEventTypeCount(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.info("일정 유형별 개수 조회 요청: startDate={}, endDate={}", startDate, endDate);

        try {
            Map<String, Long> counts = calendarEventService.getEventTypeCount(startDate, endDate);
            return ResponseEntity.ok(counts);
        } catch (Exception e) {
            log.error("일정 유형별 개수 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
