package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ExpenseRequisitionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRequisitionItemRepository extends JpaRepository<ExpenseRequisitionItem, Long> {

    List<ExpenseRequisitionItem> findByExpenseRequisitionIdxOrderBySortOrderAsc(Long expenseRequisitionIdx);

    void deleteByExpenseRequisitionIdx(Long expenseRequisitionIdx);
}
