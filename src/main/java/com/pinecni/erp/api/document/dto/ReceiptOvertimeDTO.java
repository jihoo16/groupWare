package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private Long cardIdx;
    private String documentNumber;
    private Long documentIdx;
    private Long authorIdx;
    private String authorUserName;  // 조회 시 users 테이블에서 가져옴
    private LocalDate overtimeDate;
    private LocalDate approvalDate;
    private String documentTitle;
    private String documentContent;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 연관 데이터
    private List<ReceiptOvertimeAttendeeDTO> attendees;
    private List<ReceiptOvertimeAttachmentDTO> attachments;
}
