package com.pinecni.erp.api.calendar.service;

import com.pinecni.erp.api.calendar.dto.CalendarEventDto;
import com.pinecni.erp.api.calendar.dto.CalendarParticipantDto;
import com.pinecni.erp.api.calendar.repository.CalendarEventRepository;
import com.pinecni.erp.api.calendar.repository.CalendarParticipantRepository;
import com.pinecni.erp.entity.CalendarEvent;
import com.pinecni.erp.entity.CalendarParticipant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
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
                .creatorIdx(eventDto.getCreatorIdx())
                .creatorName(eventDto.getCreatorName())
                .groupId(groupId)
                .notificationYn(eventDto.getNotificationYn() != null ? eventDto.getNotificationYn() : "N")
                .notificationMinutes(eventDto.getNotificationMinutes())
                .isRecurring(eventDto.getIsRecurring() != null ? eventDto.getIsRecurring() : false)
                .recurringType(eventDto.getRecurringType())
                .recurringEndDate(eventDto.getRecurringEndDate())
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .createdBy(eventDto.getCreatorIdx())
                .build();

        CalendarEvent savedEvent = calendarEventRepository.save(event);

        // 참석자 저장
        if (eventDto.getParticipants() != null && !eventDto.getParticipants().isEmpty()) {
            for (CalendarParticipantDto participantDto : eventDto.getParticipants()) {
                CalendarParticipant participant = CalendarParticipant.builder()
                        .eventIdx(savedEvent.getIdx())
                        .userIdx(participantDto.getUserIdx())
                        .userName(participantDto.getUserName())
                        .participationStatus("PENDING")
                        .receiveNotification(participantDto.getReceiveNotification() != null ? participantDto.getReceiveNotification() : "Y")
                        .createdAt(LocalDateTime.now())
                        .build();

                calendarParticipantRepository.save(participant);
            }
        }

        log.info("일정 생성 완료: eventIdx={}", savedEvent.getIdx());

        return getEventById(savedEvent.getIdx());
    }

    /**
     * 일정 수정
     */
    @Transactional
    public CalendarEventDto updateEvent(Long eventIdx, CalendarEventDto eventDto) {
        log.info("일정 수정: eventIdx={}", eventIdx);

        CalendarEvent event = calendarEventRepository.findById(eventIdx)
                .orElseThrow(() -> new RuntimeException("일정을 찾을 수 없습니다."));

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
        event.setUpdatedBy(eventDto.getCreatorIdx());

        calendarEventRepository.save(event);

        // 기존 참석자 삭제
        List<CalendarParticipant> existingParticipants = calendarParticipantRepository.findByEventIdx(eventIdx);
        calendarParticipantRepository.deleteAll(existingParticipants);

        // 새 참석자 추가
        if (eventDto.getParticipants() != null && !eventDto.getParticipants().isEmpty()) {
            for (CalendarParticipantDto participantDto : eventDto.getParticipants()) {
                CalendarParticipant participant = CalendarParticipant.builder()
                        .eventIdx(eventIdx)
                        .userIdx(participantDto.getUserIdx())
                        .userName(participantDto.getUserName())
                        .participationStatus(participantDto.getParticipationStatus() != null ? participantDto.getParticipationStatus() : "PENDING")
                        .receiveNotification(participantDto.getReceiveNotification() != null ? participantDto.getReceiveNotification() : "Y")
                        .createdAt(LocalDateTime.now())
                        .build();

                calendarParticipantRepository.save(participant);
            }
        }

        log.info("일정 수정 완료: eventIdx={}", eventIdx);

        return getEventById(eventIdx);
    }

    /**
     * 일정 삭제 (soft delete)
     */
    @Transactional
    public void deleteEvent(Long eventIdx, Long userId) {
        log.info("일정 삭제: eventIdx={}", eventIdx);

        CalendarEvent event = calendarEventRepository.findById(eventIdx)
                .orElseThrow(() -> new RuntimeException("일정을 찾을 수 없습니다."));

        event.setDeletedAt(LocalDateTime.now());
        event.setDeletedBy(userId);

        calendarEventRepository.save(event);

        log.info("일정 삭제 완료: eventIdx={}", eventIdx);
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
                .creatorIdx(event.getCreatorIdx())
                .creatorName(event.getCreatorName())
                .approvalIdx(event.getApprovalIdx())
                .groupId(event.getGroupId())
                .notificationYn(event.getNotificationYn())
                .notificationMinutes(event.getNotificationMinutes())
                .isRecurring(event.getIsRecurring())
                .recurringType(event.getRecurringType())
                .recurringEndDate(event.getRecurringEndDate())
                .status(event.getStatus())
                .participants(participantDtos)
                .build();
    }
}
