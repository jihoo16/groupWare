package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 지출품의서 생성·수정 요청 DTO (CREATE / UPDATE 공용)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseRequisitionCreateDTO {

    /** 품의 내용 (필수) */
    private String content;

    /** 지급종류 (필수): 현금 | 사업비카드 | 개인카드 */
    private String paymentType;

    /** 특이사항 (선택) */
    private String specialNote;

    /** 지출 예정 내역 항목 (최소 1건 필수) */
    @Builder.Default
    private List<ExpenseRequisitionItemDTO> items = new ArrayList<>();
}
