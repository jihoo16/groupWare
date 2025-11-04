package com.pinecni.erp.api.calendar.controller;

import com.pinecni.erp.api.calendar.dto.CalendarEventDto;
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
 * 캘린더 이벤트 REST API Controller
 */
@RestController
@RequestMapping("/api/calendar/events")
@RequiredArgsConstructor
@Slf4j
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    /**
     * 기간별 일정 조회
     * GET /api/calendar/events?startDate=2025-01-01&endDate=2025-12-31
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getEventsBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        log.info("기간별 일정 조회 요청: startDate={}, endDate={}", startDate, endDate);

        try {
            List<CalendarEventDto> events = calendarEventService.getEventsBetween(startDate, endDate);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("startDate", startDate);
            response.put("endDate", endDate);
            response.put("count", events.size());
            response.put("events", events);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("기간별 일정 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 일정 상세 조회
     * GET /api/calendar/events/{eventIdx}
     */
    @GetMapping("/{eventIdx}")
    public ResponseEntity<Map<String, Object>> getEventById(@PathVariable Long eventIdx) {
        log.info("일정 상세 조회 요청: eventIdx={}", eventIdx);

        try {
            CalendarEventDto event = calendarEventService.getEventById(eventIdx);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("event", event);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("일정 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 일정 생성
     * POST /api/calendar/events
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createEvent(@RequestBody CalendarEventDto eventDto) {
        log.info("일정 생성 요청: {}", eventDto.getEventTitle());

        try {
            CalendarEventDto createdEvent = calendarEventService.createEvent(eventDto);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "일정이 등록되었습니다.");
            response.put("event", createdEvent);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("일정 생성 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 생성 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 일정 수정
     * PUT /api/calendar/events/{eventIdx}
     */
    @PutMapping("/{eventIdx}")
    public ResponseEntity<Map<String, Object>> updateEvent(
            @PathVariable Long eventIdx,
            @RequestBody CalendarEventDto eventDto) {

        log.info("일정 수정 요청: eventIdx={}", eventIdx);

        try {
            CalendarEventDto updatedEvent = calendarEventService.updateEvent(eventIdx, eventDto);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "일정이 수정되었습니다.");
            response.put("event", updatedEvent);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("일정 수정 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 수정 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 일정 삭제
     * DELETE /api/calendar/events/{eventIdx}
     */
    @DeleteMapping("/{eventIdx}")
    public ResponseEntity<Map<String, Object>> deleteEvent(
            @PathVariable Long eventIdx,
            @RequestParam Long userId) {

        log.info("일정 삭제 요청: eventIdx={}", eventIdx);

        try {
            calendarEventService.deleteEvent(eventIdx, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "일정이 삭제되었습니다.");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("일정 삭제 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 삭제 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 사용자별 일정 조회
     * GET /api/calendar/events/creator/{userIdx}
     */
    @GetMapping("/creator/{userIdx}")
    public ResponseEntity<Map<String, Object>> getEventsByCreator(@PathVariable Long userIdx) {
        log.info("사용자별 일정 조회 요청: userIdx={}", userIdx);

        try {
            List<CalendarEventDto> events = calendarEventService.getEventsByCreator(userIdx);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", events.size());
            response.put("events", events);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("사용자별 일정 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 일정 타입별 조회
     * GET /api/calendar/events/type/{eventType}
     */
    @GetMapping("/type/{eventType}")
    public ResponseEntity<Map<String, Object>> getEventsByType(@PathVariable String eventType) {
        log.info("일정 타입별 조회 요청: eventType={}", eventType);

        try {
            List<CalendarEventDto> events = calendarEventService.getEventsByType(eventType);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("eventType", eventType);
            response.put("count", events.size());
            response.put("events", events);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("일정 타입별 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "일정 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * 참석자 참여 상태 업데이트
     * PATCH /api/calendar/events/participants/{participantIdx}/status
     */
    @PatchMapping("/participants/{participantIdx}/status")
    public ResponseEntity<Map<String, Object>> updateParticipationStatus(
            @PathVariable Long participantIdx,
            @RequestParam String status) {

        log.info("참석 상태 업데이트 요청: participantIdx={}, status={}", participantIdx, status);

        try {
            calendarEventService.updateParticipationStatus(participantIdx, status);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "참석 상태가 업데이트되었습니다.");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("참석 상태 업데이트 실패: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "참석 상태 업데이트 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
