package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDate;
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

    /**
     * 기안자 사용자 IDX
     */
    private Long userIdx;

    /**
     * 기안일자
     */
    private LocalDate documentDate;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 품의내용
     */
    private String content;

    /**
     * 지출 항목 목록
     */
    @Builder.Default
    private List<ExpenseDetailDTO> expenseDetails = new ArrayList<>();
}
