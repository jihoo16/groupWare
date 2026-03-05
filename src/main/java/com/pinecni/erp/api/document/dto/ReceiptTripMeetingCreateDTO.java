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
 * 연구비증빙 회의+출장 통합 생성 DTO
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

    // ─── 출장 ──────────────────────────────────────────────────────
    /** 출장 시작일 */
    private LocalDate tripDate;

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

    /** 회의 내용 */
    private String meetingContent;

    /** 회의 참석자 (내부 + 외부, participation_type='회의') */
    private List<ReceiptMeetingAttendeeDTO> meetingAttendees;
}
