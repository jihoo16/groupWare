package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 연구비증빙 단독출장 조회용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripDTO {

    /** 출장 IDX */
    private Long idx;

    /** 전자결재 문서 IDX */
    private Long documentIdx;

    /** 문서 번호 */
    private String documentNumber;

    /** 프로젝트 IDX */
    private Long projectIdx;

    /** 프로젝트 명 */
    private String projectName;

    /** 카드 IDX */
    private Long cardIdx;

    /** 카드명 */
    private String cardName;

    /** 문서 작성자 IDX (드래프터) */
    private Long drafterUserIdx;

    /** 작성자 이름 */
    private String authorUserName;

    /** 작성자 부서 코드 */
    private String authorDept;

    /** 작성자 부서명 */
    private String authorDeptName;

    /** 출장 일자 */
    private LocalDate tripDate;

    /** 품의서 날짜 */
    private LocalDate requisitionDate;

    /** 출장 기간 (일수, 0=당일) */
    private Integer duration;

    /** 출장지 */
    private String location;

    /** 총 경비 합계 */
    private BigDecimal totalFee;

    /** 출장 목적 */
    private String purpose;

    /** 출장 내용 */
    private String content;

    /** 참석자/동행자 목록 */
    private List<ReceiptTripAttendeeDTO> attendees;

    /** 일별 비용 명세 목록 */
    private List<ReceiptTripDailyExpenseDTO> dailyExpenses;

    /** 첨부파일 목록 */
    private List<ReceiptTripAttachmentDTO> attachments;

    /** 생성 일시 */
    private LocalDateTime createdAt;

    /** 수정 일시 */
    private LocalDateTime updatedAt;
}
