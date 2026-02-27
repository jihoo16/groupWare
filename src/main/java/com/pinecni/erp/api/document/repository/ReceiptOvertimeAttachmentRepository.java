package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptOvertimeAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptOvertimeAttachment Repository
 * 연구비증빙 야근식대 첨부파일 조회
 */
@Repository
public interface ReceiptOvertimeAttachmentRepository extends JpaRepository<ReceiptOvertimeAttachment, Long> {

    /**
     * 야근식대별 첨부파일 목록 조회
     */
    @Query("SELECT a FROM ReceiptOvertimeAttachment a WHERE a.receiptOvertimeIdx.id = :receiptOvertimeIdx ORDER BY a.id")
    List<ReceiptOvertimeAttachment> findByReceiptOvertimeIdx(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx);

    /**
     * 야근식대의 모든 첨부파일 삭제
     */
    @Query("DELETE FROM ReceiptOvertimeAttachment a WHERE a.receiptOvertimeIdx.id = :receiptOvertimeIdx")
    void deleteByReceiptOvertimeIdx(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx);

    /**
     * 야근식대 IDX + 첨부파일 종류별 파일 수 조회 (연번 계산용)
     */
    @Query("SELECT COUNT(a) FROM ReceiptOvertimeAttachment a WHERE a.receiptOvertimeIdx.id = :receiptOvertimeIdx AND a.attachmentType = :attachmentType")
    long countByReceiptOvertimeIdxAndAttachmentType(@Param("receiptOvertimeIdx") Long receiptOvertimeIdx, @Param("attachmentType") String attachmentType);
}
