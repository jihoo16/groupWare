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
     * 부서/소속
     */
    private String department;

    /**
     * 이름
     */
    private String name;

    /**
     * 사용자 IDX (User 테이블 참조)
     */
    private Long userIdx;

    /**
     * 직책/직급 (조회 시 User 테이블에서 가져옴)
     */
    private String position;

    /**
     * 직급 코드 (User.empPosition - 경비 설정 조회용)
     */
    private String positionCode;

    /**
     * 표시 순서
     */
    private Integer displayOrder;
}
