package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * 지출 항목 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseDetailDTO {

    /** 항목 IDX (조회 응답용 — 상세 페이지에서 항목별 영수증 업로드 시 식별자) */
    private Long idx;

    /** 지출 일자 (YYYY-MM-DD) */
    private LocalDate expenseDate;

    /** 적요 */
    private String description;

    /** 상호 */
    private String shopName;

    /** 결제수단 (개인카드 / 현금) */
    private String paymentMethod;

    /** 금액 */
    private Long amount;

    /** 비고 */
    private String note;

    /** 항목별 영수증 목록 (조회 응답용) */
    @Builder.Default
    private List<ExpenseApprovalAttachmentDTO> attachments = new ArrayList<>();
}
