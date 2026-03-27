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
    /** RECEIPT: 영수증, DOCUMENT: 서명완료 공식문서 */
    private String attachmentType;
    private Long uploadUserIdx;
    private Boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
