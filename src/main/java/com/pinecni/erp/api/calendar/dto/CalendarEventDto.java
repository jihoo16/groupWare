package com.pinecni.erp.api.calendar.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 캘린더 이벤트 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventDto {

    private Long idx;

    private String eventTitle;

    private String eventType;

    private String eventDescription;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime startTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime endTime;

    private Boolean isAllDay;

    private String location;

    private Long creatorIdx;

    private String creatorName;

    private Long approvalIdx;

    private String groupId;

    private String notificationYn;

    private Integer notificationMinutes;

    private Boolean isRecurring;

    private String recurringType;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate recurringEndDate;

    private String status;

    // 팀 관련 정보
    private Long teamIdx;
    private String teamName;
    private String teamColor;

    // 화면 표시용 색상 (팀 색상 우선, 없으면 일정 유형 기반)
    private String displayColor;

    @Builder.Default
    private List<CalendarParticipantDto> participants = new ArrayList<>();
}