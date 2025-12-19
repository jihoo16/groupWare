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
 * 연구비증빙 출장 수정용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripUpdateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 출장 일자
     */
    private LocalDate tripDate;

    /**
     * 시작 시간
     */
    private LocalTime startTime;

    /**
     * 종료 시간
     */
    private LocalTime endTime;

    /**
     * 출장지
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
     * 참석자/동행자 목록
     */
    private List<ReceiptTripAttendeeDTO> attendees;
}
