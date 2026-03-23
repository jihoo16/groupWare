package com.pinecni.erp.api.expense.repository;

import com.pinecni.erp.entity.ExpenseDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseDetailRepository extends JpaRepository<ExpenseDetail, Long> {

    /**
     * 지출승인서별 상세 항목 조회
     */
    List<ExpenseDetail> findByExpenseApprovalIdxOrderByIdxAsc(Long expenseApprovalIdx);

    /**
     * 지출승인서별 상세 항목 삭제
     */
    void deleteByExpenseApprovalIdx(Long expenseApprovalIdx);
}
