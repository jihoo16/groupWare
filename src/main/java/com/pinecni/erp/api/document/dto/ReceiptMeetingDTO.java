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
 * 연구비증빙 회의록 조회용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptMeetingDTO {

    /**
     * 회의록 IDX
     */
    private Long idx;

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트 명
     */
    private String projectName;

    /**
     * 카드 IDX
     */
    private Long cardIdx;

    /**
     * 카드명 (화면 표시용)
     */
    private String cardName;

    /**
     * 문서 번호
     */
    private String documentNumber;

    /**
     * 전자결재 문서 IDX
     */
    private Long documentIdx;

    /**
     * 작성자 IDX
     */
    private Long authorIdx;

    /**
     * 작성자 이름 (users 테이블에서 조회)
     */
    private String authorUserName;

    /**
     * 작성자 부서
     */
    private String authorDept;

    /**
     * 작성자 부서명
     */
    private String authorDeptName;

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
     * 지불 방법
     */
    private String paymentMethod;

    /**
     * 비고
     */
    private String notes;

    /**
     * 회의록 특이사항
     */
    private String minutesNotes;

    /**
     * 상태 (PENDING, APPROVED, REJECTED)
     */
    private String status;

    /**
     * 참석자 목록
     */
    private List<ReceiptMeetingAttendeeDTO> attendees;

    /**
     * 결재선 목록
     */
    private List<ReceiptMeetingApprovalDTO> approvals;

    /**
     * 생성 일시
     */
    private LocalDateTime createdAt;

    /**
     * 수정 일시
     */
    private LocalDateTime updatedAt;
}
