package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 연구비증빙 출장 생성용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripCreateDTO {

    /** 프로젝트 IDX */
    private Long projectIdx;

    /** 카드 IDX */
    private Long cardIdx;

    /** 문서 작성자 IDX (드래프터, 로그인 사용자와 다를 수 있음) */
    private Long drafterUserIdx;

    /** 출장 일자 */
    private LocalDate tripDate;

    /** 품의서 날짜 */
    private LocalDate requisitionDate;

    /** 출장 기간 (일수, 0=당일) */
    private Integer duration;

    /** 출장지 */
    private String location;

    /** 교통비 */
    private BigDecimal transportationFee;

    /** 숙박비 */
    private BigDecimal accommodationFee;

    /** 식비 */
    private BigDecimal mealFee;

    /** 기타/일비 */
    private BigDecimal otherFee;

    /** 출장 목적 */
    private String purpose;

    /** 출장 내용 */
    private String content;

    /** 참석자/동행자 목록 */
    private List<ReceiptTripAttendeeDTO> attendees;

    /** 일별 비용 명세 목록 */
    private List<ReceiptTripDailyExpenseDTO> dailyExpenses;
}
