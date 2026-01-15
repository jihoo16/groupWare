package com.pinecni.erp.api.file.service;

import com.pinecni.erp.api.file.dto.FileUploadDTO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 파일 저장/관리 Service Interface
 */
public interface FileService {

    /**
     * 파일 업로드
     *
     * @param file MultipartFile
     * @param documentIdx 문서 IDX
     * @param uploadUserIdx 업로드 사용자 IDX
     * @return FileUploadDTO
     */
    FileUploadDTO uploadFile(MultipartFile file, Long documentIdx, Long uploadUserIdx);

    /**
     * 파일 다운로드
     *
     * @param fileIdx 파일 IDX
     * @return Resource
     */
    Resource downloadFile(Long fileIdx);

    /**
     * 문서의 파일 목록 조회
     *
     * @param documentIdx 문서 IDX
     * @return List<FileUploadDTO>
     */
    List<FileUploadDTO> getFilesByDocument(Long documentIdx);

    /**
     * 파일 정보 조회
     *
     * @param fileIdx 파일 IDX
     * @return FileUploadDTO
     */
    FileUploadDTO getFileInfo(Long fileIdx);

    /**
     * 파일 삭제 (소프트 딜리트)
     *
     * @param fileIdx 파일 IDX
     * @param deletedUserIdx 삭제 사용자 IDX
     */
    void deleteFile(Long fileIdx, Long deletedUserIdx);
}
