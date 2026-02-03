package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptOvertimeAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptOvertimeAttendee Repository
 * 연구비증빙 야근식대 참석자 조회
 */
@Repository
public interface ReceiptOvertimeAttendeeRepository extends JpaRepository<ReceiptOvertimeAttendee, Long> {

    /**
     * 야근식대별 참석자 목록 조회
     */
    @Query("SELECT a FROM ReceiptOvertimeAttendee a WHERE a.receiptOvertimeIdx.id = :receiptOvertimeIdx ORDER BY a.idx")
    List<ReceiptOvertimeAttendee> findByReceiptOvertimeIdx(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx);

    /**
     * 야근식대의 모든 참석자 삭제
     */
    @Query("DELETE FROM ReceiptOvertimeAttendee a WHERE a.receiptOvertimeIdx.id = :receiptOvertimeIdx")
    void deleteByReceiptOvertimeIdx(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx);
}
