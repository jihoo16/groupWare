package com.pinecni.erp.api.approval.repository;

import com.pinecni.erp.entity.ApprovalDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * ApprovalDocument Repository
 */
@Repository
public interface ApprovalDocumentRepository extends JpaRepository<ApprovalDocument, Long> {

    /**
     * 문서번호로 조회
     */
    Optional<ApprovalDocument> findByDocumentNo(String documentNo);

    /**
     * 기안자별 문서 조회
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.drafterUserIdx = :userIdx AND d.deletedAt IS NULL " +
            "ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findByDrafterUserIdx(Long userIdx);

    /**
     * 문서 유형별 조회
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.documentType = :documentType AND d.deletedAt IS NULL " +
            "ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findByDocumentType(String documentType);

    /**
     * 부서별 문서 조회 (User 테이블 JOIN)
     */
    @Query("SELECT d FROM ApprovalDocument d " +
            "JOIN User u ON d.drafterUserIdx = u.idx " +
            "WHERE u.empDept = :departmentCode AND d.deletedAt IS NULL " +
            "ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findByDepartmentCode(String departmentCode);

    /**
     * 기간별 문서 조회
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.deletedAt IS NULL " +
            "AND d.createdAt BETWEEN :startDate AND :endDate ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 제목 검색
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.title LIKE %:keyword% AND d.deletedAt IS NULL")
    List<ApprovalDocument> searchByTitle(String keyword);

    /**
     * 활성 문서 조회 (삭제되지 않은)
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.deletedAt IS NULL ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findAllActive();

    /**
     * 일반 전자결재 문서 조회 (is_project = false)
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.isProject = false AND d.deletedAt IS NULL " +
            "ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findGeneralDocuments();

    /**
     * 프로젝트 문서 조회 (is_project = true)
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.isProject = true AND d.deletedAt IS NULL " +
            "ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findProjectDocuments();

    /**
     * 전체 문서 조회 (삭제되지 않은, 최신순) - Service용 alias
     * @deprecated 일반/프로젝트 구분을 위해 findGeneralDocuments() 또는 findProjectDocuments() 사용 권장
     */
    @Deprecated
    default List<ApprovalDocument> findAllByDeletedAtIsNullOrderByCreatedAtDesc() {
        return findAllActive();
    }

    /**
     * 문서 타입별 조회 (삭제되지 않은, 최신순) - Service용 alias
     */
    default List<ApprovalDocument> findByDocumentTypeAndDeletedAtIsNullOrderByCreatedAtDesc(String documentType) {
        return findByDocumentType(documentType);
    }

    /**
     * 기안자별 조회 (삭제되지 않은, 최신순) - Service용 alias
     */
    default List<ApprovalDocument> findByDrafterUserIdxAndDeletedAtIsNullOrderByCreatedAtDesc(Long drafterUserIdx) {
        return findByDrafterUserIdx(drafterUserIdx);
    }
}
