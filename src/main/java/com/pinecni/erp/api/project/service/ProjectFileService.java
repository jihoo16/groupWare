package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ProjectFileDTO;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 프로젝트 파일 Service Interface
 */
public interface ProjectFileService {

    /**
     * 프로젝트 파일 업로드
     *
     * @param file MultipartFile
     * @param projectIdx 프로젝트 IDX
     * @param uploadUserIdx 업로드 사용자 IDX
     * @return ProjectFileDTO
     */
    ProjectFileDTO uploadFile(MultipartFile file, Long projectIdx, Long uploadUserIdx);

    /**
     * 프로젝트 파일 다운로드
     *
     * @param fileIdx 파일 IDX
     * @return Resource
     */
    Resource downloadFile(Long fileIdx);

    /**
     * 프로젝트별 파일 목록 조회
     *
     * @param projectIdx 프로젝트 IDX
     * @return List<ProjectFileDTO>
     */
    List<ProjectFileDTO> getFilesByProject(Long projectIdx);

    /**
     * 파일 정보 조회
     *
     * @param fileIdx 파일 IDX
     * @return ProjectFileDTO
     */
    ProjectFileDTO getFileInfo(Long fileIdx);

    /**
     * 파일 삭제 (소프트 딜리트)
     *
     * @param fileIdx 파일 IDX
     * @param deletedUserIdx 삭제 사용자 IDX
     */
    void deleteFile(Long fileIdx, Long deletedUserIdx);
}
