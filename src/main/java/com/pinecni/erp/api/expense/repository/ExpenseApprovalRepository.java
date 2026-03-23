package com.pinecni.erp.api.expense.repository;

import com.pinecni.erp.entity.ExpenseApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseApprovalRepository extends JpaRepository<ExpenseApproval, Long> {

    /**
     * 사용자별 지출승인서 목록 조회 (soft delete 제외, 최신순)
     */
    List<ExpenseApproval> findByUserIdxAndDeletedFalseOrderByCreatedAtDesc(Long userIdx);

    /**
     * document_idx로 조회
     */
    Optional<ExpenseApproval> findByDocumentIdx(Long documentIdx);

    /**
     * 지출 상세 항목과 함께 조회 (N+1 방지)
     */
    @Query("SELECT DISTINCT ea FROM ExpenseApproval ea " +
           "LEFT JOIN FETCH ea.expenseDetails " +
           "WHERE ea.idx = :idx AND ea.deleted = false")
    Optional<ExpenseApproval> findByIdxWithDetails(@Param("idx") Long idx);
}
