package com.pinecni.erp.api.file.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 파일 업로드 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadDTO {

    private Long idx;
    private Long documentIdx;
    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private Long uploadUserIdx;
    private LocalDateTime createdAt;

    // 다운로드 URL (프론트엔드에서 사용)
    private String downloadUrl;
}
