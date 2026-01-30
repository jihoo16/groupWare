package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 야근식대 인원 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOvertimePersonDTO {

    private Long idx;
    private Long receiptOvertimeIdx;
    private String name;
    private String workTime;
    private String workTask;
    private Instant createdAt;
    private Instant updatedAt;
}
