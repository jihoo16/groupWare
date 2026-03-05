package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeetingDailyExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 연구비증빙 회의+출장 일별 비용 명세 Repository
 */
@Repository
public interface ReceiptTripMeetingDailyExpenseRepository extends JpaRepository<ReceiptTripMeetingDailyExpense, Long> {

    /**
     * 회의+출장 IDX로 일별 명세 목록 조회 (day_number 오름차순)
     */
    List<ReceiptTripMeetingDailyExpense> findByReceiptTripMeetingIdxOrderByExpenseDateAsc(Long receiptTripMeetingIdx);

    /**
     * 회의+출장 IDX로 일별 명세 삭제
     */
    void deleteByReceiptTripMeetingIdx(Long receiptTripMeetingIdx);
}
