package com.pinecni.erp.api.document.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptPurchaseAttachmentDTO {
    private Long idx;
    private Long receiptPurchaseIdx;
    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private String attachmentType;
    private Long uploadUserIdx;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
