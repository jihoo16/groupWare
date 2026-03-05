package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 연구비증빙 출장 수정용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripUpdateDTO {

    /** 프로젝트 IDX */
    private Long projectIdx;

    /** 카드 IDX */
    private Long cardIdx;

    /** 출장 일자 */
    private LocalDate tripDate;

    /** 출장 기간 (일수, 0=당일) */
    private Integer duration;

    /** 출장지 */
    private String location;

    /** 교통비 (합산되어 total_fee 로 저장) */
    private BigDecimal transportationFee;

    /** 숙박비 (합산되어 total_fee 로 저장) */
    private BigDecimal accommodationFee;

    /** 식비 (합산되어 total_fee 로 저장) */
    private BigDecimal mealFee;

    /** 기타/일비 (합산되어 total_fee 로 저장) */
    private BigDecimal otherFee;

    /** 출장 목적 */
    private String purpose;

    /** 출장 내용 */
    private String content;

    /** 참석자/동행자 목록 */
    private List<ReceiptTripAttendeeDTO> attendees;
}
