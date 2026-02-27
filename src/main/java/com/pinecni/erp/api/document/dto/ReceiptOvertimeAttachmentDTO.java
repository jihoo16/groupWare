package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 야근식대 첨부파일 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOvertimeAttachmentDTO {

    private Long idx;
    private Long receiptOvertimeIdx;
    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private String attachmentType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
