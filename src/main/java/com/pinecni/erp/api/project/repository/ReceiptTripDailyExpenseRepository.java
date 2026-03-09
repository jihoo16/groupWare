package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripDailyExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 연구비증빙 단독출장 일별 비용 명세 Repository
 */
@Repository
public interface ReceiptTripDailyExpenseRepository extends JpaRepository<ReceiptTripDailyExpense, Long> {

    /** 출장 IDX로 일별 비용 목록 조회 (날짜 오름차순) */
    List<ReceiptTripDailyExpense> findByReceiptTripIdxOrderByExpenseDateAsc(Long receiptTripIdx);

    /** 출장 IDX에 해당하는 일별 비용 전체 삭제 (물리 삭제) */
    @Modifying
    @Query("DELETE FROM ReceiptTripDailyExpense e WHERE e.receiptTripIdx = :receiptTripIdx")
    void deleteByReceiptTripIdx(@Param("receiptTripIdx") Long receiptTripIdx);
}
