package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 연구비증빙 회의록 결재 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptMeetingApprovalDTO {

    /**
     * 결재 IDX
     */
    private Long idx;

    /**
     * 결재자 IDX
     */
    private Long approverIdx;

    /**
     * 결재자 이름
     */
    private String approverName;

    /**
     * 결재자 부서
     */
    private String approverDept;

    /**
     * 결재자 직급
     */
    private String approverPosition;

    /**
     * 결재 상태 (PENDING, APPROVED, REJECTED)
     */
    private String status;

    /**
     * 결재 일시
     */
    private LocalDateTime approvedAt;
}
