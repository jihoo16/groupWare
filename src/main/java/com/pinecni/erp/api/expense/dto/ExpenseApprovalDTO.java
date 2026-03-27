package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Collections;

/**
 * 지출승인서 조회 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseApprovalDTO {

    private Long idx;

    /** 기안자 사용자 IDX */
    private Long userIdx;

    /** 총 금액 */
    private Long totalAmount;

    /** 문서 IDX (approval_documents 테이블 FK) */
    private Long documentIdx;

    /** 문서번호 (예: EXP-2025-00001) */
    private String documentNumber;

    /** 지출 항목 목록 */
    @Builder.Default
    private List<ExpenseDetailDTO> expenseDetails = new ArrayList<>();

    /** 첨부파일 목록 */
    @Builder.Default
    private List<ExpenseApprovalAttachmentDTO> attachments = new ArrayList<>();

    /** 기안일자 (= createdAt) */
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Long createdUserIdx;

    private Long updatedUserIdx;

    /** soft delete 여부 */
    private Boolean deleted;

    private LocalDateTime deletedAt;

    private Long deletedUserIdx;
}
