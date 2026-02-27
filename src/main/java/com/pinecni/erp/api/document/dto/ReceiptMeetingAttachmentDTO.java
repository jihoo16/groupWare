package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 회의록 첨부파일 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptMeetingAttachmentDTO {

    /**
     * 첨부파일 IDX
     */
    private Long idx;

    /**
     * 회의록 IDX
     */
    private Long receiptMeetingIdx;

    /**
     * 원본 파일명
     */
    private String originalFilename;

    /**
     * 저장 파일명
     */
    private String storedFilename;

    /**
     * 파일 경로 (디렉토리)
     */
    private String filePath;

    /**
     * 파일 크기 (bytes)
     */
    private Long fileSize;

    /**
     * 파일 타입 (MIME type)
     */
    private String fileType;

    /**
     * 첨부파일 종류: RECEIPT(영수증) 또는 DOCUMENT(공식문서)
     */
    private String attachmentType;

    /**
     * 업로드 사용자 IDX
     */
    private Long uploadUserIdx;

    /**
     * 업로드 일시
     */
    private LocalDateTime uploadedAt;
}
