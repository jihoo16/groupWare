package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 프로젝트 파일 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectFileDTO {

    private Long idx;
    private Long projectIdx;
    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private Long fileSize;
    private String fileType;
    private String description;
    private Long uploadUserIdx;
    private LocalDateTime createdAt;

    // 다운로드 URL (프론트엔드에서 사용)
    private String downloadUrl;
}
