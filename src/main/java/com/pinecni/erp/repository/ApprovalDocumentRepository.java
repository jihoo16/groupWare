package com.pinecni.erp.repository;

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
     * 상태별 문서 조회
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.status = :status AND d.deletedAt IS NULL " +
            "ORDER BY d.createdAt DESC")
    List<ApprovalDocument> findByStatus(String status);

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
     * 부서별 문서 조회
     */
    @Query("SELECT d FROM ApprovalDocument d WHERE d.departmentCode = :departmentCode AND d.deletedAt IS NULL " +
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
}
