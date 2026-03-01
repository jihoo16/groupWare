package com.pinecni.erp.api.approval.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 문서 목록에서 첨부파일 빠른 다운로드를 위한 요약 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentSummaryDTO {
    private Long idx;
    private String originalFilename;
    private String attachmentType;  // RECEIPT(영수증) / DOCUMENT(공식문서)
    private String downloadUrl;
}
