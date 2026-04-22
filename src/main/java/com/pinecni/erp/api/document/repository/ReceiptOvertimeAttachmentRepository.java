package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptOvertimeAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptOvertimeAttachment Repository
 * 연구비증빙 야근식대 첨부파일 조회 / 소프트 딜리트
 */
@Repository
public interface ReceiptOvertimeAttachmentRepository extends JpaRepository<ReceiptOvertimeAttachment, Long> {

    /**
     * 야근식대별 첨부파일 목록 조회 (삭제되지 않은 건, idx 오름차순)
     */
    List<ReceiptOvertimeAttachment> findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(Long receiptOvertimeIdx);

    /**
     * 야근식대별 전체 첨부파일 조회 (삭제 포함, 파일명 갱신용)
     */
    List<ReceiptOvertimeAttachment> findByReceiptOvertimeIdxOrderByIdxAsc(Long receiptOvertimeIdx);

    /**
     * 야근식대 IDX + 첨부파일 종류별 파일 수 조회 (연번 계산용, 삭제 제외)
     */
    long countByReceiptOvertimeIdxAndAttachmentTypeAndDeletedFalse(
            Long receiptOvertimeIdx, String attachmentType);

    List<ReceiptOvertimeAttachment> findByReceiptOvertimeIdxInAndDeletedFalseOrderByIdxAsc(List<Long> receiptOvertimeIdxs);

    /**
     * 야근식대의 모든 첨부파일 소프트 딜리트
     */
    @Modifying
    @Query("""
        UPDATE ReceiptOvertimeAttachment a
        SET a.deleted = true,
            a.deletedAt = CURRENT_TIMESTAMP,
            a.deletedUserIdx = :deletedUserIdx
        WHERE a.receiptOvertimeIdx = :receiptOvertimeIdx
          AND a.deleted = false
        """)
    void softDeleteByReceiptOvertimeIdx(
            @Param("receiptOvertimeIdx") Long receiptOvertimeIdx,
            @Param("deletedUserIdx") Long deletedUserIdx);
}
