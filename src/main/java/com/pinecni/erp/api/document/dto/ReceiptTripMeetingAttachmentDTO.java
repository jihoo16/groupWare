package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 연구비증빙 출장+회의 첨부파일 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripMeetingAttachmentDTO {

    private Long idx;
    private Long receiptTripMeetingIdx;
    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    /** RECEIPT(영수증) / DOCUMENT(공식문서) */
    private String attachmentType;
    private Long uploadUserIdx;
    private Boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
