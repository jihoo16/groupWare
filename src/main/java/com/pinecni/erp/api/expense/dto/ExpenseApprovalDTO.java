package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 지출승인서 조회 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseApprovalDTO {

    /**
     * 지출승인서 IDX
     */
    private Long idx;

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
     * 신청일자
     */
    private LocalDate applyDate;

    /**
     * 총 금액
     */
    private Long totalAmount;

    /**
     * 품의내용
     */
    private String content;

    /**
     * 문서 IDX (approval_documents 테이블 FK)
     */
    private Long documentIdx;

    /**
     * 지출 항목 목록
     */
    @Builder.Default
    private List<ExpenseDetailDTO> expenseDetails = new ArrayList<>();

    /**
     * 생성일시
     */
    private LocalDateTime createdAt;

    /**
     * 수정일시
     */
    private LocalDateTime updatedAt;

    /**
     * 생성자 IDX
     */
    private Long createdUserIdx;

    /**
     * 수정자 IDX
     */
    private Long updatedUserIdx;
}
