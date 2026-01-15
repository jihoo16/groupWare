package com.pinecni.erp.api.file.mapper;

import com.pinecni.erp.api.file.dto.FileUploadDTO;
import com.pinecni.erp.entity.ApprovalFile;
import org.springframework.stereotype.Component;

/**
 * ApprovalFile Entity ↔ DTO 변환 Mapper
 */
@Component
public class FileMapper {

    /**
     * Entity → DTO 변환
     * 파일 정보 조회 시 사용
     */
    public FileUploadDTO toDTO(ApprovalFile file) {
        if (file == null) {
            return null;
        }

        return FileUploadDTO.builder()
            .idx(file.getIdx())
            .documentIdx(file.getDocumentIdx())
            .originalFilename(file.getOriginalFilename())
            .storedFilename(file.getStoredFilename())
            .filePath(file.getFilePath())
            .fileSize(file.getFileSize())
            .fileType(file.getFileType())
            .uploadUserIdx(file.getUploadUserIdx())
            .createdAt(file.getCreatedAt())
            .downloadUrl("/api/files/download/" + file.getIdx())
            .build();
    }
}
