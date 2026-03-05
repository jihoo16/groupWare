package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 연구비증빙 회의+출장 통합 저장 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripMeetingResponseDTO {

    /** 저장된 receipt_trip_meeting IDX */
    private Long receiptTripMeetingIdx;

    /** 공유 전자결재 문서 IDX */
    private Long documentIdx;

    /** 문서 번호 (RCTM-YYYY-NNNN) */
    private String documentNumber;
}
