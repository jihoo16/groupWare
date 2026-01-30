package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

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
    private String savingFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private Instant createdAt;
    private Instant updatedAt;
}
