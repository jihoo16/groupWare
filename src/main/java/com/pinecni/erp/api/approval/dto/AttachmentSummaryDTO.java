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
    private Long sessionIdx;        // RCTM 회의 세션 PK (null = 출장 파일 또는 구버전 데이터)
}
