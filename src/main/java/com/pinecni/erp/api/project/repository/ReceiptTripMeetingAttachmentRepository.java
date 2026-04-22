package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeetingAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 연구비증빙 출장+회의 첨부파일 Repository
 */
@Repository
public interface ReceiptTripMeetingAttachmentRepository extends JpaRepository<ReceiptTripMeetingAttachment, Long> {

    /**
     * 출장+회의 IDX로 첨부파일 목록 조회 (삭제되지 않은 건, idx 오름차순)
     */
    List<ReceiptTripMeetingAttachment> findByReceiptTripMeetingIdxAndDeletedFalseOrderByIdxAsc(Long receiptTripMeetingIdx);

    /**
     * 출장+회의 IDX + 타입별 파일 수 조회 (연번 계산용, 삭제되지 않은 건)
     */
    long countByReceiptTripMeetingIdxAndAttachmentTypeAndDeletedFalse(Long receiptTripMeetingIdx, String attachmentType);

    List<ReceiptTripMeetingAttachment> findByReceiptTripMeetingIdxInAndDeletedFalseOrderByIdxAsc(List<Long> receiptTripMeetingIdxs);

    /**
     * 출장+회의 IDX로 첨부파일 전체 목록 (삭제 포함)
     */
    List<ReceiptTripMeetingAttachment> findByReceiptTripMeetingIdxOrderByIdxAsc(Long receiptTripMeetingIdx);

    /**
     * 출장+회의 삭제 시 첨부파일 일괄 소프트 딜리트
     */
    @Modifying
    @Query("UPDATE ReceiptTripMeetingAttachment a SET a.deleted = true, a.deletedAt = CURRENT_TIMESTAMP, a.deletedUserIdx = :deletedUserIdx " +
            "WHERE a.receiptTripMeetingIdx = :receiptTripMeetingIdx AND a.deleted = false")
    void softDeleteByReceiptTripMeetingIdx(@Param("receiptTripMeetingIdx") Long receiptTripMeetingIdx,
                                           @Param("deletedUserIdx") Long deletedUserIdx);

    /**
     * 세션 IDX로 첨부파일 목록 조회 (삭제되지 않은 건)
     */
    List<ReceiptTripMeetingAttachment> findBySessionIdxAndDeletedFalseOrderByIdxAsc(Long sessionIdx);

    /**
     * 세션 하드 딜리트 후 재삽입 시 보존된 첨부파일의 session_idx를 새 세션 PK로 업데이트
     */
    @Modifying
    @Query("UPDATE ReceiptTripMeetingAttachment a SET a.sessionIdx = :newIdx WHERE a.sessionIdx = :oldIdx AND a.deleted = false")
    void updateSessionIdxByOldIdx(@Param("oldIdx") Long oldIdx, @Param("newIdx") Long newIdx);
}
