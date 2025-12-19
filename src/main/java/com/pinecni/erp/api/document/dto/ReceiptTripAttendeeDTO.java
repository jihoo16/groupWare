package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 연구비증빙 출장 참석자/동행자 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripAttendeeDTO {

    /**
     * 참석자 IDX
     */
    private Long idx;

    /**
     * 참석자 타입 ("내부" 또는 "외부")
     */
    private String attendeeType;

    /**
     * 부서/소속
     */
    private String department;

    /**
     * 이름
     */
    private String name;

    /**
     * 사용자 IDX (내부 참석자인 경우)
     * 또는 외부인력 IDX (외부 참석자인 경우)
     * attendee_type에 따라 User 또는 ExternalPerson 테이블 참조
     */
    private Long userIdx;

    /**
     * 직책/직급 (조회 시 User 또는 ExternalPerson에서 가져옴)
     */
    private String position;

    /**
     * 표시 순서
     */
    private Integer displayOrder;
}
