package com.pinecni.erp.api.expense.dto;

import lombok.*;

import java.time.LocalDateTime;

/**
 * 지출승인서 첨부파일 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseApprovalAttachmentDTO {

    private Long idx;
    private Long expenseApprovalIdx;
    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    /** ITEM_RECEIPT: 항목별 영수증, DOCUMENT: 서명완료 공식문서, RECEIPT: 레거시 */
    private String attachmentType;
    /** 연결된 지출 항목 IDX (항목별 영수증일 때 값 있음, 문서 전체 첨부일 때 NULL) */
    private Long expenseDetailIdx;
    private Long uploadUserIdx;
    private Boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
