package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 지출승인서 생성 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseApprovalCreateDTO {

    /** 기안자 사용자 IDX (서버에서 세션 기반으로 세팅, 프론트 null 허용) */
    private Long userIdx;

    /** 지출 항목 목록 (최소 1건 필수) */
    @Builder.Default
    private List<ExpenseDetailDTO> expenseDetails = new ArrayList<>();
}
