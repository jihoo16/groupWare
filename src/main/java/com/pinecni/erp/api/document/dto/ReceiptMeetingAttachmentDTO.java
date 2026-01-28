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
     * 파일명
     */
    private String fileName;

    /**
     * 파일 경로
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
     * 업로드 사용자 IDX
     */
    private Long uploadUserIdx;

    /**
     * 업로드 일시
     */
    private LocalDateTime uploadedAt;
}
