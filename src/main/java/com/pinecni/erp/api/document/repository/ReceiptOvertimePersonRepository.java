package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptOvertimePerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptOvertimePerson Repository
 * 연구비증빙 야근식대 인원 조회
 */
@Repository
public interface ReceiptOvertimePersonRepository extends JpaRepository<ReceiptOvertimePerson, Long> {

    /**
     * 야근식대별 인원 목록 조회
     */
    @Query("SELECT p FROM ReceiptOvertimePerson p WHERE p.receiptOvertimeIdx.id = :receiptOvertimeIdx ORDER BY p.id")
    List<ReceiptOvertimePerson> findByReceiptOvertimeIdx(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx);

    /**
     * 야근식대의 모든 인원 삭제
     */
    @Query("DELETE FROM ReceiptOvertimePerson p WHERE p.receiptOvertimeIdx.id = :receiptOvertimeIdx")
    void deleteByReceiptOvertimeIdx(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx);
}
