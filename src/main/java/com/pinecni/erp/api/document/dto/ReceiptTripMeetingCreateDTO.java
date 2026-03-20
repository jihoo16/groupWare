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
 * 연구비증빙 출장+회의 통합 생성 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripMeetingCreateDTO {

    // ─── 공통 ──────────────────────────────────────────────────────
    /** 프로젝트 IDX */
    private Long projectIdx;

    /** 카드 IDX */
    private Long cardIdx;

    /** 문서 작성자 IDX (드래프터, 로그인 사용자와 다를 수 있음) */
    private Long drafterUserIdx;

    /** 회의 작성자 IDX */
    private Long meetingDrafterUserIdx;

    // ─── 출장 ──────────────────────────────────────────────────────
    /** 출장 시작일 */
    private LocalDate tripDate;

    /** 품의서 날짜 */
    private LocalDate requisitionDate;

    /** 출장 박 수 (0=당일) */
    private Integer duration;

    /** 출장지 */
    private String location;

    /** 출장 목적 */
    private String purpose;

    /** 출장 내용 및 결과 */
    private String tripContent;

    /**
     * 일별 비용 명세 목록
     * - 당일 출장(duration=0): 1개 항목(dayNumber=1)
     * - 다박 출장(duration≥1): duration+1 개 항목
     */
    private List<ReceiptTripMeetingDailyExpenseDTO> dailyExpenses;

    /** 출장 참석자 (내부 인원만, participation_type='출장') */
    private List<ReceiptTripAttendeeDTO> tripAttendees;

    // ─── 회의 ──────────────────────────────────────────────────────
    /** 회의 일자 */
    private LocalDate meetingDate;

    /** 회의 시작 시간 */
    private LocalTime startTime;

    /** 회의 종료 시간 */
    private LocalTime endTime;

    /** 회의비 합계 */
    private BigDecimal meetingAmount;

    /** 회의 목적 (회의록 주제, receipt_meeting.purpose 에 대응) */
    private String meetingPurpose;

    /** 회의 내용 */
    private String meetingContent;

    /** 회의 참석자 (내부 + 외부, participation_type='회의') */
    private List<ReceiptMeetingAttendeeDTO> meetingAttendees;

    /**
     * 다중 회의 세션 목록 (출장 1건에 여러 회의가 있을 때 사용)
     * - null 또는 empty: 위의 단일 회의 필드 사용 (backward compat)
     * - non-empty: 이 목록의 각 세션이 개별 회의로 저장됨
     */
    private List<MeetingSessionDTO> meetingSessions;
}
