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
 * 연구비증빙 회의록 수정용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptMeetingUpdateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 카드 IDX
     */
    private Long cardIdx;

    /**
     * 작성자 IDX
     */
    private Long authorIdx;

    /**
     * 회의 일자
     */
    private LocalDate meetingDate;

    /**
     * 시작 시간
     */
    private LocalTime startTime;

    /**
     * 종료 시간
     */
    private LocalTime endTime;

    /**
     * 장소
     */
    private String location;

    /**
     * 금액
     */
    private BigDecimal amount;

    /**
     * 목적
     */
    private String purpose;

    /**
     * 내용
     */
    private String content;

    /**
     * 참석자 목록
     */
    private List<ReceiptMeetingAttendeeDTO> attendees;

    /**
     * 삭제할 첨부파일 IDX 목록
     */
    private List<Long> deletedAttachmentIds;
}
