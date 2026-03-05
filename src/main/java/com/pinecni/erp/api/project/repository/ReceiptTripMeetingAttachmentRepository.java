package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeetingAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 연구비증빙 회의+출장 첨부파일 Repository
 */
@Repository
public interface ReceiptTripMeetingAttachmentRepository extends JpaRepository<ReceiptTripMeetingAttachment, Long> {

    /**
     * 회의+출장 IDX로 첨부파일 목록 조회 (삭제되지 않은 건, idx 오름차순)
     */
    List<ReceiptTripMeetingAttachment> findByReceiptTripMeetingIdxAndDeletedFalseOrderByIdxAsc(Long receiptTripMeetingIdx);

    /**
     * 회의+출장 IDX + 타입별 파일 수 조회 (연번 계산용, 삭제되지 않은 건)
     */
    long countByReceiptTripMeetingIdxAndAttachmentTypeAndDeletedFalse(Long receiptTripMeetingIdx, String attachmentType);

    /**
     * 회의+출장 IDX로 첨부파일 전체 목록 (삭제 포함)
     */
    List<ReceiptTripMeetingAttachment> findByReceiptTripMeetingIdxOrderByIdxAsc(Long receiptTripMeetingIdx);
}
