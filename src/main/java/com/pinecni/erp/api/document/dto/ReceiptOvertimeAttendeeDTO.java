package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 야근식대 참석자 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOvertimeAttendeeDTO {

    private Long idx;
    private Long receiptOvertimeIdx;
    private Long userIdx;
    private String userName;  // 조회 시 users 테이블에서 가져옴
    private String workTime;
    private String workTask;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
