package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * 지출품의서 지출 예정 내역 항목 DTO
 * 생성(CreateDTO 내 중첩) / 응답(ResponseDTO 내 중첩) 공용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRequisitionItemDTO {
    private Long idx;                   // 응답 시에만 사용
    private Long expenseRequisitionIdx; // 응답 시에만 사용
    private String itemDate;            // "yyyy-MM-dd"
    private String itemDesc;            // 적요
    private BigDecimal amount;          // 금액
    private String vendor;              // 상호
    private String remark;              // 비고
    private Integer sortOrder;          // 화면 표시 순서 (0-based)
}
