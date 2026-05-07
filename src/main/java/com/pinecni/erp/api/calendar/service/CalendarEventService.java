package com.pinecni.erp.api.calendar.service;

import com.pinecni.erp.api.calendar.dto.CalendarEventDto;
import com.pinecni.erp.api.calendar.dto.CalendarParticipantDto;
import com.pinecni.erp.api.calendar.dto.TeamFilterDto;
import com.pinecni.erp.api.calendar.repository.CalendarEventRepository;
import com.pinecni.erp.api.calendar.repository.CalendarParticipantRepository;
import com.pinecni.erp.api.team.repository.TeamRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.CalendarEvent;
import com.pinecni.erp.entity.CalendarParticipant;
import com.pinecni.erp.entity.Team;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 캘린더 이벤트 Service
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final CalendarParticipantRepository calendarParticipantRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final com.pinecni.erp.api.notification.service.NotificationEnqueueService notificationEnqueueService;

    /**
     * 기간별 일정 조회
     */
    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsBetween(LocalDate startDate, LocalDate endDate) {
        log.info("기간별 일정 조회: {} ~ {}", startDate, endDate);

        List<CalendarEvent> events = calendarEventRepository.findEventsBetween(startDate, endDate);

        return events.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 일정 상세 조회
     */
    @Transactional(readOnly = true)
    public CalendarEventDto getEventById(Long eventIdx) {
        log.info("일정 상세 조회: eventIdx={}", eventIdx);

        CalendarEvent event = calendarEventRepository.findById(eventIdx)
                .orElseThrow(() -> new RuntimeException("일정을 찾을 수 없습니다."));

        return convertToDto(event);
    }

    /**
     * 일정 생성
     */
    @Transactional
    public CalendarEventDto createEvent(CalendarEventDto eventDto) {
        log.info("일정 생성: {}", eventDto.getEventTitle());

        // 그룹 ID 생성 (연속 일정 관리용)
        String groupId = UUID.randomUUID().toString();

        // 이벤트 저장
        CalendarEvent event = CalendarEvent.builder()
                .eventTitle(eventDto.getEventTitle())
                .eventType(eventDto.getEventType())
                .eventDescription(eventDto.getEventDescription())
                .startDate(eventDto.getStartDate())
                .endDate(eventDto.getEndDate())
                .startTime(eventDto.getStartTime())
                .endTime(eventDto.getEndTime())
                .isAllDay(eventDto.getIsAllDay() != null ? eventDto.getIsAllDay() : false)
                .location(eventDto.getLocation())
                .groupId(groupId)
                .notificationYn(eventDto.getNotificationYn() != null ? eventDto.getNotificationYn() : "N")
                .notificationMinutes(eventDto.getNotificationMinutes())
                .isRecurring(eventDto.getIsRecurring() != null ? eventDto.getIsRecurring() : false)
                .recurringType(eventDto.getRecurringType())
                .recurringEndDate(eventDto.getRecurringEndDate())
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .createdUserIdx(eventDto.getCreatorIdx())
                .build();

        CalendarEvent savedEvent = calendarEventRepository.save(event);

        // 참석자 저장
        if (eventDto.getParticipants() != null && !eventDto.getParticipants().isEmpty()) {
            for (CalendarParticipantDto participantDto : eventDto.getParticipants()) {
                Long userIdx = participantDto.getUserIdx();
                String userName = participantDto.getUserName();

                // userName이 없으면 건너뛰기
                if (userName == null || userName.trim().isEmpty()) {
                    log.warn("참석자 이름이 없습니다. 건너뜁니다.");
                    continue;
                }

                // userIdx가 null이면 외부 참석자 - 이름 조회 없이 null 그대로 저장
                if (userIdx == null) {
                    log.debug("외부 참석자 '{}' 저장 (userIdx=null)", userName);
                }

                CalendarParticipant participant = CalendarParticipant.builder()
                        .eventIdx(savedEvent.getIdx())
                        .userIdx(userIdx)
                        .userName(userName)
                        .participationStatus("PENDING")
                        .receiveNotification(participantDto.getReceiveNotification() != null ? participantDto.getReceiveNotification() : "Y")
                        .createdAt(LocalDateTime.now())
                        .build();

                calendarParticipantRepository.save(participant);
            }
        }

        log.info("일정 생성 완료: eventIdx={}", savedEvent.getIdx());

        // 알림 발송 — 참석자에게 일정 초대 (C1908). 본인이 등록자이면 SKIP, 외부인 SKIP.
        try {
            enqueueCalendarInviteNotifications(savedEvent, eventDto);
        } catch (Exception e) {
            log.warn("[일정초대 알림 enqueue 실패 — 무시하고 진행] eventIdx={}, error={}",
                    savedEvent.getIdx(), e.getMessage());
        }

        return getEventById(savedEvent.getIdx());
    }

    private void enqueueCalendarInviteNotifications(CalendarEvent savedEvent, CalendarEventDto eventDto) {
        if (eventDto.getParticipants() == null || eventDto.getParticipants().isEmpty()) return;

        Long creatorIdx = eventDto.getCreatorIdx();
        String actorName = creatorIdx != null
                ? userRepository.findById(creatorIdx).map(User::getEmpName).orElse("등록자")
                : "등록자";

        java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.format.DateTimeFormatter dtFmt   = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        String eventStart = savedEvent.getStartDate() != null
                ? savedEvent.getStartDate().format(dateFmt) +
                  (savedEvent.getStartTime() != null ? " " + savedEvent.getStartTime() : "")
                : "-";
        String eventEnd   = savedEvent.getEndDate() != null
                ? savedEvent.getEndDate().format(dateFmt) +
                  (savedEvent.getEndTime() != null ? " " + savedEvent.getEndTime() : "")
                : "-";
        String eventStartDate = savedEvent.getStartDate() != null
                ? savedEvent.getStartDate().format(dateFmt) : "";

        for (CalendarParticipantDto p : eventDto.getParticipants()) {
            Long recipientIdx = p.getUserIdx();
            // 외부인 (userIdx null) SKIP — MM 계정 없음
            if (recipientIdx == null) continue;

            String recipientName = userRepository.findById(recipientIdx)
                    .map(User::getEmpName)
                    .orElse(p.getUserName() != null ? p.getUserName() : "");

            java.util.Map<String, Object> vars = new java.util.LinkedHashMap<>();
            vars.put("recipientName", recipientName);
            vars.put("eventTitle",    savedEvent.getEventTitle() != null ? savedEvent.getEventTitle() : "(제목 없음)");
            vars.put("eventStart",    eventStart);
            vars.put("eventEnd",      eventEnd);
            vars.put("eventLocation", savedEvent.getLocation() != null ? savedEvent.getLocation() : "(장소 미정)");
            vars.put("actorName",     actorName);
            vars.put("eventStartDate", eventStartDate);
            vars.put("eventTime",     LocalDateTime.now().format(dtFmt));
            vars.put("deepLink",      "/calendar?date=" + eventStartDate);

            notificationEnqueueService.enqueue(
                    com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                            .notificationType("C1908")
                            .channel("C2101")
                            .channel("C2103")
                            .recipientUserIdx(recipientIdx)
                            .actorUserIdx(creatorIdx)
                            .targetType("C1703")  // calendar_events
                            .targetIdx(savedEvent.getIdx())
                            .variables(vars)
                            .dedupKey("CAL-INVITE:" + savedEvent.getIdx() + ":" + recipientIdx)
                            .build());
        }
    }

    /**
     * 일정 수정
     */
    @Transactional
    public CalendarEventDto updateEvent(Long eventIdx, CalendarEventDto eventDto) {
        log.info("일정 수정: eventIdx={}", eventIdx);

        CalendarEvent event = calendarEventRepository.findById(eventIdx)
                .orElseThrow(() -> new RuntimeException("일정을 찾을 수 없습니다."));

        // 변경 항목 감지 (알림용) — 수정 전 스냅샷
        java.util.List<String> changedFields = new java.util.ArrayList<>();
        if (!java.util.Objects.equals(event.getStartDate(), eventDto.getStartDate())
                || !java.util.Objects.equals(event.getStartTime(), eventDto.getStartTime())
                || !java.util.Objects.equals(event.getEndDate(),   eventDto.getEndDate())
                || !java.util.Objects.equals(event.getEndTime(),   eventDto.getEndTime())) {
            changedFields.add("일시");
        }
        if (!java.util.Objects.equals(event.getLocation(), eventDto.getLocation())) {
            changedFields.add("장소");
        }
        if (!java.util.Objects.equals(event.getEventTitle(), eventDto.getEventTitle())) {
            changedFields.add("제목");
        }

        // 이벤트 정보 수정
        event.setEventTitle(eventDto.getEventTitle());
        event.setEventType(eventDto.getEventType());
        event.setEventDescription(eventDto.getEventDescription());
        event.setStartDate(eventDto.getStartDate());
        event.setEndDate(eventDto.getEndDate());
        event.setStartTime(eventDto.getStartTime());
        event.setEndTime(eventDto.getEndTime());
        event.setIsAllDay(eventDto.getIsAllDay());
        event.setLocation(eventDto.getLocation());
        event.setNotificationYn(eventDto.getNotificationYn());
        event.setNotificationMinutes(eventDto.getNotificationMinutes());
        event.setIsRecurring(eventDto.getIsRecurring());
        event.setRecurringType(eventDto.getRecurringType());
        event.setRecurringEndDate(eventDto.getRecurringEndDate());
        event.setUpdatedAt(LocalDateTime.now());
        event.setUpdatedUserIdx(eventDto.getCreatorIdx());

        calendarEventRepository.save(event);

        // 기존 참석자 삭제
        List<CalendarParticipant> existingParticipants = calendarParticipantRepository.findByEventIdx(eventIdx);
        calendarParticipantRepository.deleteAll(existingParticipants);
        calendarParticipantRepository.flush(); // 즉시 DB에 반영하여 unique constraint 충돌 방지

        // 새 참석자 추가
        if (eventDto.getParticipants() != null && !eventDto.getParticipants().isEmpty()) {
            for (CalendarParticipantDto participantDto : eventDto.getParticipants()) {
                Long userIdx = participantDto.getUserIdx();
                String userName = participantDto.getUserName();

                // userName이 없으면 건너뛰기
                if (userName == null || userName.trim().isEmpty()) {
                    log.warn("참석자 이름이 없습니다. 건너뜁니다.");
                    continue;
                }

                // userIdx가 null이면 외부 참석자 - 이름 조회 없이 null 그대로 저장
                if (userIdx == null) {
                    log.debug("외부 참석자 '{}' 저장 (userIdx=null)", userName);
                }

                CalendarParticipant participant = CalendarParticipant.builder()
                        .eventIdx(eventIdx)
                        .userIdx(userIdx)
                        .userName(userName)
                        .participationStatus(participantDto.getParticipationStatus() != null ? participantDto.getParticipationStatus() : "PENDING")
                        .receiveNotification(participantDto.getReceiveNotification() != null ? participantDto.getReceiveNotification() : "Y")
                        .createdAt(LocalDateTime.now())
                        .build();

                calendarParticipantRepository.save(participant);
            }
        }

        log.info("일정 수정 완료: eventIdx={}", eventIdx);

        // C1909 — 의미 있는 변경이 있을 때만 참여자에게 알림
        if (!changedFields.isEmpty()) {
            try {
                enqueueCalendarUpdateNotifications(event, eventDto, String.join(", ", changedFields));
            } catch (Exception e) {
                log.warn("[일정변경 알림 enqueue 실패 — 무시하고 진행] eventIdx={}, error={}",
                        eventIdx, e.getMessage());
            }
        }

        return getEventById(eventIdx);
    }

    private void enqueueCalendarUpdateNotifications(CalendarEvent event, CalendarEventDto eventDto, String changes) {
        if (eventDto.getParticipants() == null || eventDto.getParticipants().isEmpty()) return;

        Long actorIdx = eventDto.getCreatorIdx();
        String actorName = actorIdx != null
                ? userRepository.findById(actorIdx).map(User::getEmpName).orElse("등록자")
                : "등록자";

        java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.format.DateTimeFormatter dtFmt   = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        String eventStart = event.getStartDate() != null
                ? event.getStartDate().format(dateFmt) +
                  (event.getStartTime() != null ? " " + event.getStartTime() : "") : "-";
        String eventEnd = event.getEndDate() != null
                ? event.getEndDate().format(dateFmt) +
                  (event.getEndTime() != null ? " " + event.getEndTime() : "") : "-";
        String eventStartDate = event.getStartDate() != null ? event.getStartDate().format(dateFmt) : "";

        for (CalendarParticipantDto p : eventDto.getParticipants()) {
            Long recipientIdx = p.getUserIdx();
            if (recipientIdx == null) continue;

            String recipientName = userRepository.findById(recipientIdx)
                    .map(User::getEmpName)
                    .orElse(p.getUserName() != null ? p.getUserName() : "");

            java.util.Map<String, Object> vars = new java.util.LinkedHashMap<>();
            vars.put("recipientName", recipientName);
            vars.put("eventTitle",    event.getEventTitle() != null ? event.getEventTitle() : "(제목 없음)");
            vars.put("changedFields", changes);
            vars.put("eventStart",    eventStart);
            vars.put("eventEnd",      eventEnd);
            vars.put("eventLocation", event.getLocation() != null ? event.getLocation() : "(장소 미정)");
            vars.put("actorName",     actorName);
            vars.put("eventStartDate", eventStartDate);
            vars.put("eventTime",     LocalDateTime.now().format(dtFmt));
            vars.put("deepLink",      "/calendar?date=" + eventStartDate);

            notificationEnqueueService.enqueue(
                    com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                            .notificationType("C1909")
                            .channel("C2101")
                            .channel("C2103")
                            .recipientUserIdx(recipientIdx)
                            .actorUserIdx(actorIdx)
                            .targetType("C1703")
                            .targetIdx(event.getIdx())
                            .variables(vars)
                            .dedupKey("CAL-UPDATE:" + event.getIdx() + ":" + recipientIdx + ":"
                                    + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")))
                            .build());
        }
    }

    /**
     * 일정 삭제 (soft delete)
     */
    @Transactional
    public void deleteEvent(Long eventIdx, Long userId) {
        log.info("일정 삭제: eventIdx={}", eventIdx);

        CalendarEvent event = calendarEventRepository.findById(eventIdx)
                .orElseThrow(() -> new RuntimeException("일정을 찾을 수 없습니다."));

        // 삭제 전 스냅샷 (알림용)
        CalendarEvent eventSnapshot = event;
        java.util.List<CalendarParticipant> participants = calendarParticipantRepository.findByEventIdx(eventIdx);

        event.setDeletedAt(LocalDateTime.now());
        event.setDeletedUserIdx(userId);

        calendarEventRepository.save(event);

        log.info("일정 삭제 완료: eventIdx={}", eventIdx);

        // C1910 — 참여자에게 일정 취소 알림 (등록자 본인 SKIP, 외부인 SKIP)
        try {
            enqueueCalendarCancelNotifications(eventSnapshot, participants, userId);
        } catch (Exception e) {
            log.warn("[일정취소 알림 enqueue 실패 — 무시하고 진행] eventIdx={}, error={}",
                    eventIdx, e.getMessage());
        }
    }

    private void enqueueCalendarCancelNotifications(CalendarEvent event,
                                                    java.util.List<CalendarParticipant> participants,
                                                    Long actorIdx) {
        if (participants == null || participants.isEmpty()) return;

        String actorName = actorIdx != null
                ? userRepository.findById(actorIdx).map(User::getEmpName).orElse("등록자")
                : "등록자";

        java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
        java.time.format.DateTimeFormatter dtFmt   = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        String eventStart = event.getStartDate() != null
                ? event.getStartDate().format(dateFmt) +
                  (event.getStartTime() != null ? " " + event.getStartTime() : "") : "-";
        String eventEnd = event.getEndDate() != null
                ? event.getEndDate().format(dateFmt) +
                  (event.getEndTime() != null ? " " + event.getEndTime() : "") : "-";

        for (CalendarParticipant p : participants) {
            Long recipientIdx = p.getUserIdx();
            if (recipientIdx == null) continue;

            java.util.Map<String, Object> vars = new java.util.LinkedHashMap<>();
            vars.put("eventTitle",    event.getEventTitle() != null ? event.getEventTitle() : "(제목 없음)");
            vars.put("eventStart",    eventStart);
            vars.put("eventEnd",      eventEnd);
            vars.put("actorName",     actorName);
            vars.put("eventTime",     LocalDateTime.now().format(dtFmt));
            vars.put("deepLink",      "/calendar");

            notificationEnqueueService.enqueue(
                    com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                            .notificationType("C1910")
                            .channel("C2101")
                            .channel("C2103")
                            .recipientUserIdx(recipientIdx)
                            .actorUserIdx(actorIdx)
                            .targetType("C1703")
                            .targetIdx(event.getIdx())
                            .variables(vars)
                            .dedupKey("CAL-CANCEL:" + event.getIdx() + ":" + recipientIdx)
                            .build());
        }
    }

    /**
     * 사용자별 일정 조회
     */
    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsByCreator(Long userIdx) {
        log.info("사용자별 일정 조회: userIdx={}", userIdx);

        List<CalendarEvent> events = calendarEventRepository.findByCreatorIdx(userIdx);

        return events.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 일정 타입별 조회
     */
    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsByType(String eventType) {
        log.info("일정 타입별 조회: eventType={}", eventType);

        List<CalendarEvent> events = calendarEventRepository.findByEventType(eventType);

        return events.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 참석자 참여 상태 업데이트
     */
    @Transactional
    public void updateParticipationStatus(Long participantIdx, String status) {
        log.info("참석 상태 업데이트: participantIdx={}, status={}", participantIdx, status);

        CalendarParticipant participant = calendarParticipantRepository.findById(participantIdx)
                .orElseThrow(() -> new RuntimeException("참석자를 찾을 수 없습니다."));

        participant.setParticipationStatus(status);

        calendarParticipantRepository.save(participant);

        log.info("참석 상태 업데이트 완료");
    }

    /**
     * 팀 목록 조회 (일정 개수 포함)
     */
    @Transactional(readOnly = true)
    public List<TeamFilterDto> getTeamsWithEventCount(LocalDate startDate, LocalDate endDate) {
        log.info("팀 목록 조회 (일정 개수 포함): {} ~ {}", startDate, endDate);

        // 모든 활성 팀 조회
        List<Team> teams = teamRepository.findByIsActive("Y");

        // 팀별 일정 개수 조회
        List<Object[]> eventCounts = calendarEventRepository.countEventsByTeam(startDate, endDate);
        Map<Long, Long> countMap = new HashMap<>();
        for (Object[] row : eventCounts) {
            Long teamIdx = (Long) row[0];
            Long count = (Long) row[1];
            countMap.put(teamIdx, count);
        }

        // TeamFilterDto로 변환
        return teams.stream()
                .map(team -> TeamFilterDto.builder()
                        .idx(team.getIdx())
                        .teamName(team.getTeamName())
                        .teamColor(team.getTeamColor())
                        .eventCount(countMap.getOrDefault(team.getIdx(), 0L))
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 일정 유형별 개수 조회
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getEventTypeCount(LocalDate startDate, LocalDate endDate) {
        log.info("일정 유형별 개수 조회: {} ~ {}", startDate, endDate);

        List<Object[]> counts = calendarEventRepository.countEventsByType(startDate, endDate);

        Map<String, Long> result = new HashMap<>();
        for (Object[] row : counts) {
            String eventType = (String) row[0];
            Long count = (Long) row[1];
            result.put(eventType, count);
        }

        return result;
    }

    /**
     * 필터링된 일정 조회
     */
    @Transactional(readOnly = true)
    public List<CalendarEventDto> getEventsWithFilters(
            LocalDate startDate,
            LocalDate endDate,
            List<Long> teamIds,
            List<String> eventTypes) {

        log.info("필터링된 일정 조회: {} ~ {}, teamIds={}, eventTypes={}",
                startDate, endDate, teamIds, eventTypes);

        // 빈 리스트 처리 - null이거나 비어있으면 모든 팀/유형 조회
        if (teamIds == null || teamIds.isEmpty()) {
            List<Team> allTeams = teamRepository.findByIsActive("Y");
            teamIds = allTeams.stream().map(Team::getIdx).collect(Collectors.toList());
            if (teamIds.isEmpty()) {
                teamIds = List.of(-1L); // 팀이 없는 경우 빈 결과 방지
            }
        }

        if (eventTypes == null || eventTypes.isEmpty()) {
            eventTypes = List.of("business", "meeting-room", "leave", "etc");
        }

        List<CalendarEvent> events = calendarEventRepository.findEventsWithFilters(
                startDate, endDate, teamIds, eventTypes);

        return events.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Entity를 DTO로 변환
     */
    private CalendarEventDto convertToDto(CalendarEvent event) {
        // 참석자 목록 조회
        List<CalendarParticipant> participants = calendarParticipantRepository.findByEventIdx(event.getIdx());

        List<CalendarParticipantDto> participantDtos = participants.stream()
                .map(p -> CalendarParticipantDto.builder()
                        .idx(p.getIdx())
                        .eventIdx(p.getEventIdx())
                        .userIdx(p.getUserIdx())
                        .userName(p.getUserName())
                        .participationStatus(p.getParticipationStatus())
                        .receiveNotification(p.getReceiveNotification())
                        .build())
                .collect(Collectors.toList());

        // 팀 정보 조회
        String teamName = null;
        String teamColor = null;
        String displayColor = null;

        if (event.getTeamIdx() != null) {
            Optional<Team> teamOpt = teamRepository.findById(event.getTeamIdx().longValue());
            if (teamOpt.isPresent()) {
                Team team = teamOpt.get();
                teamName = team.getTeamName();
                teamColor = team.getTeamColor();
                displayColor = teamColor;
            }
        }

        // 팀 색상이 없으면 일정 유형별 색상 사용
        if (displayColor == null) {
            displayColor = getEventTypeColor(event.getEventType());
        }

        // 작성자(생성자) 이름 조회
        String creatorName = null;
        if (event.getCreatedUserIdx() != null) {
            creatorName = userRepository.findById(event.getCreatedUserIdx())
                    .map(User::getEmpName)
                    .orElse(null);
        }

        return CalendarEventDto.builder()
                .idx(event.getIdx())
                .eventTitle(event.getEventTitle())
                .eventType(event.getEventType())
                .eventDescription(event.getEventDescription())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .isAllDay(event.getIsAllDay())
                .location(event.getLocation())
                .creatorIdx(event.getCreatedUserIdx())
                .creatorName(creatorName)
                .approvalIdx(event.getApprovalIdx())
                .groupId(event.getGroupId())
                .teamIdx(event.getTeamIdx())
                .teamName(teamName)
                .teamColor(teamColor)
                .displayColor(displayColor)
                .notificationYn(event.getNotificationYn())
                .notificationMinutes(event.getNotificationMinutes())
                .isRecurring(event.getIsRecurring())
                .recurringType(event.getRecurringType())
                .recurringEndDate(event.getRecurringEndDate())
                .status(event.getStatus())
                .participants(participantDtos)
                .build();
    }

    /**
     * 일정 유형별 기본 색상 반환
     */
    private String getEventTypeColor(String eventType) {
        switch (eventType) {
            case "business":
                return "#667eea";
            case "meeting-room":
                return "#38b2ac";
            case "leave":
                return "#ed8936";
            case "etc":
                return "#9f7aea";
            default:
                return "#4361ee";
        }
    }
}
