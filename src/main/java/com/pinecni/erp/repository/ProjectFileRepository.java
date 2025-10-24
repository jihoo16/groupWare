package com.pinecni.erp.repository;

import com.pinecni.erp.entity.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ProjectFile Repository
 */
@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFile, Long> {

    /**
     * 프로젝트별 파일 목록 조회
     */
    @Query("SELECT f FROM ProjectFile f WHERE f.projectIdx = :projectIdx AND f.isDeleted = false " +
            "ORDER BY f.createdAt DESC")
    List<ProjectFile> findByProjectIdx(Long projectIdx);

    /**
     * 업로드 사용자별 파일 조회
     */
    @Query("SELECT f FROM ProjectFile f WHERE f.uploadUserIdx = :userIdx AND f.isDeleted = false " +
            "ORDER BY f.createdAt DESC")
    List<ProjectFile> findByUploadUserIdx(Long userIdx);

    /**
     * 파일 타입별 조회
     */
    @Query("SELECT f FROM ProjectFile f WHERE f.projectIdx = :projectIdx " +
            "AND f.fileType = :fileType AND f.isDeleted = false")
    List<ProjectFile> findByProjectIdxAndFileType(Long projectIdx, String fileType);

    /**
     * 원본 파일명 검색
     */
    @Query("SELECT f FROM ProjectFile f WHERE f.projectIdx = :projectIdx " +
            "AND f.originalFilename LIKE %:keyword% AND f.isDeleted = false")
    List<ProjectFile> searchByFilename(Long projectIdx, String keyword);
}
