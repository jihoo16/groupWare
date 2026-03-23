package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ExpenseRequisition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRequisitionRepository extends JpaRepository<ExpenseRequisition, Long> {

    // 작성자별 목록 (최신순)
    List<ExpenseRequisition> findByAuthorIdxAndIsDeletedFalseOrderByCreatedAtDesc(Long authorIdx);

    // 단건 + 항목 JOIN FETCH (N+1 방지)
    @Query("SELECT r FROM ExpenseRequisition r LEFT JOIN FETCH r.items WHERE r.idx = :idx AND r.isDeleted = false")
    Optional<ExpenseRequisition> findByIdxWithItems(@Param("idx") Long idx);

    // 전자결재 문서 연결 조회 (soft-delete 제외)
    Optional<ExpenseRequisition> findByDocumentIdxAndIsDeletedFalse(Long documentIdx);
}
