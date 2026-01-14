package com.pinecni.erp.api.approval.repository;

import com.pinecni.erp.entity.ApprovalFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ApprovalFile Repository
 */
@Repository
public interface ApprovalFileRepository extends JpaRepository<ApprovalFile, Long> {

    /**
     * 문서별 첨부파일 조회
     */
    @Query("SELECT f FROM ApprovalFile f WHERE f.documentIdx = :documentIdx AND (f.isDeleted IS NULL OR f.isDeleted = false) " +
            "ORDER BY f.createdAt DESC")
    List<ApprovalFile> findByDocumentIdx(Long documentIdx);

    /**
     * 문서별 첨부파일 조회
     */
    default List<ApprovalFile> findByDocumentIdxAndIsDeletedFalseOrderByCreatedAtDesc(Long documentIdx) {
        return findByDocumentIdx(documentIdx);
    }

    /**
     * 업로드 사용자별 파일 조회
     */
    @Query("SELECT f FROM ApprovalFile f WHERE f.uploadUserIdx = :userIdx AND (f.isDeleted IS NULL OR f.isDeleted = false) " +
            "ORDER BY f.createdAt DESC")
    List<ApprovalFile> findByUploadUserIdx(Long userIdx);

    /**
     * 파일 타입별 조회
     */
    @Query("SELECT f FROM ApprovalFile f WHERE f.documentIdx = :documentIdx " +
            "AND f.fileType = :fileType AND (f.isDeleted IS NULL OR f.isDeleted = false)")
    List<ApprovalFile> findByDocumentIdxAndFileType(Long documentIdx, String fileType);

    /**
     * 원본 파일명 검색
     */
    @Query("SELECT f FROM ApprovalFile f WHERE f.documentIdx = :documentIdx " +
            "AND f.originalFilename LIKE %:keyword% AND (f.isDeleted IS NULL OR f.isDeleted = false)")
    List<ApprovalFile> searchByFilename(Long documentIdx, String keyword);
}
