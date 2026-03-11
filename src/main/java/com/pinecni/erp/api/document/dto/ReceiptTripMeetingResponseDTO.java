package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 연구비증빙 출장+회의 통합 응답 DTO
 * - 생성/수정 응답 및 상세 조회에 공통 사용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripMeetingResponseDTO {

    // ── 식별 정보 ──────────────────────────────────────────────────
    private Long receiptTripMeetingIdx;
    private Long documentIdx;
    private String documentNumber;

    // ── 공통 ───────────────────────────────────────────────────────
    private Long projectIdx;
    private Long cardIdx;
    private Long drafterUserIdx;
    private Long meetingDrafterUserIdx;
    private Boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ── 출장 정보 ──────────────────────────────────────────────────
    private LocalDate tripDate;
    private Integer duration;
    private String location;
    private String purpose;
    private String content;
    private BigDecimal totalFee;
    private List<ReceiptTripMeetingDailyExpenseDTO> dailyExpenses;
    private List<ReceiptTripAttendeeDTO> tripAttendees;

    // ── 회의 정보 ──────────────────────────────────────────────────
    private LocalDate eventDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String meetingPurpose;
    private String minutesNotes;
    private List<ReceiptMeetingAttendeeDTO> meetingAttendees;

    // ── 회의비 ─────────────────────────────────────────────────────
    private BigDecimal meetingAmount;

    // ── 첨부파일 ───────────────────────────────────────────────────
    private List<ReceiptTripMeetingAttachmentDTO> attachments;

    // ── 다중 회의 세션 ──────────────────────────────────────────────
    /** 다중 회의 세션 목록 (응답 전용) */
    private List<MeetingSessionDTO> meetingSessions;
}
