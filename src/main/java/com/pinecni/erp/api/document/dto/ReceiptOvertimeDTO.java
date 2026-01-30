package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 연구비증빙 야근식대 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOvertimeDTO {

    private Long idx;
    private Long projectIdx;
    private String projectName;
    private String documentNumber;
    private Long documentIdx;
    private Long authorIdx;
    private String authorName;
    private LocalDate overtimeDate;
    private LocalDate approvalDate;
    private String documentTitle;
    private String documentContent;
    private BigDecimal totalAmount;
    private String paymentType;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;

    // 연관 데이터
    private List<ReceiptOvertimePersonDTO> persons;
    private List<ReceiptOvertimeAttachmentDTO> attachments;
}
