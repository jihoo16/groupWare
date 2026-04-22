package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptTripAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptTripAttachment Repository
 * 연구비증빙 단독출장 첨부파일 조회
 */
@Repository
public interface ReceiptTripAttachmentRepository extends JpaRepository<ReceiptTripAttachment, Long> {

    /**
     * 출장별 첨부파일 목록 조회 (삭제되지 않은 건, idx 오름차순)
     */
    List<ReceiptTripAttachment> findByReceiptTripIdxAndDeletedFalseOrderByIdxAsc(Long receiptTripIdx);

    /**
     * 출장별 + 타입별 파일 수 조회 (연번 계산용, 삭제되지 않은 건)
     */
    long countByReceiptTripIdxAndAttachmentTypeAndDeletedFalse(Long receiptTripIdx, String attachmentType);

    List<ReceiptTripAttachment> findByReceiptTripIdxInAndDeletedFalseOrderByIdxAsc(List<Long> receiptTripIdxs);

    /**
     * 출장별 첨부파일 전체 목록 (삭제 포함, 파일명 변경 등 내부 처리용)
     */
    List<ReceiptTripAttachment> findByReceiptTripIdxOrderByIdxAsc(Long receiptTripIdx);

    /**
     * 출장 삭제 시 첨부파일 일괄 소프트 딜리트
     */
    @Modifying
    @Query("UPDATE ReceiptTripAttachment a SET a.deleted = true, a.deletedAt = CURRENT_TIMESTAMP, a.deletedUserIdx = :deletedUserIdx " +
            "WHERE a.receiptTripIdx = :receiptTripIdx AND a.deleted = false")
    void softDeleteByReceiptTripIdx(@Param("receiptTripIdx") Long receiptTripIdx,
                                    @Param("deletedUserIdx") Long deletedUserIdx);
}
