package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 연구비증빙 출장 첨부파일 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptTripAttachmentDTO {

    /** 첨부파일 IDX */
    private Long idx;

    /** 출장 IDX */
    private Long receiptTripIdx;

    /** 원본 파일명 (화면 표시용) */
    private String originalFilename;

    /** 저장 파일명 (UUID 기반, 디스크 저장명) */
    private String storedFilename;

    /** 저장 경로 (baseDir 하위 상대경로) */
    private String filePath;

    /** 파일 크기 (bytes) */
    private Long fileSize;

    /** MIME 타입 */
    private String fileType;

    /** RECEIPT(영수증) / DOCUMENT(공식문서) */
    private String attachmentType;

    /** 업로드 사용자 IDX */
    private Long uploadUserIdx;

    /** 업로드 일시 */
    private LocalDateTime uploadedAt;

    /** 생성 일시 */
    private LocalDateTime createdAt;

    /** 삭제 여부 */
    private Boolean deleted;

    /** 삭제 일시 */
    private LocalDateTime deletedAt;
}
