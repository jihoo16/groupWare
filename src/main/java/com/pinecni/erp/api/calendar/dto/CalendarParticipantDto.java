package com.pinecni.erp.api.calendar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 캘린더 참석자 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarParticipantDto {

    private Long idx;

    private Long eventIdx;

    private Long userIdx;

    private String userName;

    private String participationStatus;

    private String receiveNotification;
}