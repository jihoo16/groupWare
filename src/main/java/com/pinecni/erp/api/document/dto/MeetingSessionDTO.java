package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 출장+회의 단일 회의 세션 DTO (생성/수정/응답 공용)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingSessionDTO {

    /** 세션 IDX (응답 전용, 기존 세션 조회 시) */
    private Long sessionIdx;

    /** 표시 순서 (0부터 시작) */
    private Integer displayOrder;

    /** 회의 날짜 */
    private LocalDate meetingDate;

    /** 회의 시작 시간 */
    private LocalTime startTime;

    /** 회의 종료 시간 */
    private LocalTime endTime;

    /** 회의 장소 */
    private String meetingLocation;

    /** 회의 목적 */
    private String meetingPurpose;

    /** 회의 내용 */
    private String meetingContent;

    /** 회의 작성자 user idx */
    private Long meetingDrafterUserIdx;

    /** 실제 지출 회의비 금액 */
    private BigDecimal meetingAmount;

    /** 회의 참석자 목록 (내부 + 외부) */
    private List<ReceiptMeetingAttendeeDTO> meetingAttendees;
}
