package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 연구비증빙 회의록 참석자 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptMeetingAttendeeDTO {

    /**
     * 참석자 IDX
     */
    private Long idx;

    /**
     * 외부 참석자 여부
     * - true: 외부 인력
     * - false: 내부 인력
     */
    private Boolean isExternal;

    /**
     * 부서/소속
     */
    private String department;

    /**
     * 이름
     */
    private String name;

    /**
     * 참석자 IDX
     * - isExternal = false: users.idx
     * - isExternal = true: external_persons.idx
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

    /**
     * 회의비 (참석자별 회의 비용)
     */
    private Long meetingExpense;
}
