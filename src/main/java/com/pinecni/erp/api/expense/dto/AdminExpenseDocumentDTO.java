package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 관리자용 개인경비청구 문서 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminExpenseDocumentDTO {

    private Long idx;

    /** 기안자 정보 */
    private Long userIdx;
    private String userName;
    private String userDept;
    private String userDeptName;
    private String userPosition;

    /** 문서 정보 */
    private Long documentIdx;
    private String documentNumber;
    private Long totalAmount;

    /** 지출 항목 수 */
    private int detailCount;

    /** 항목별 영수증 첨부 현황 (영수증 있는 항목 수 / 전체 항목 수) */
    private int receiptAttachedCount;

    /** 지출 항목 목록 (상세 조회 시) */
    @Builder.Default
    private List<ExpenseDetailDTO> expenseDetails = new ArrayList<>();

    /** 문서 전체 첨부파일 목록 */
    @Builder.Default
    private List<ExpenseApprovalAttachmentDTO> attachments = new ArrayList<>();

    /** 일시 정보 */
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private Long deletedUserIdx;
    private Boolean deleted;
}
