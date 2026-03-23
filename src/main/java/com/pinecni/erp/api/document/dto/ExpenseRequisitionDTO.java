package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 지출품의서 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRequisitionDTO {
    private Long idx;
    private Long authorIdx;
    private String authorName;      // users 조인 — 작성자 이름
    private String authorDept;      // users 조인 — 부서/팀
    private String content;         // 품의 내용
    private String paymentType;     // 지급종류
    private BigDecimal totalAmount; // 금액 합계
    private String specialNote;     // 특이사항
    private Long documentIdx;       // approval_documents.idx
    private String documentNumber;  // 문서번호 (예: REQ-2026-0001)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<ExpenseRequisitionItemDTO> items;
}
