package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptMeetingAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 회의록 첨부파일 Repository
 */
@Repository
public interface ReceiptMeetingAttachmentRepository extends JpaRepository<ReceiptMeetingAttachment, Long> {

    /**
     * 회의록 IDX로 첨부파일 목록 조회
     */
    List<ReceiptMeetingAttachment> findByReceiptMeetingIdx(Long receiptMeetingIdx);

    /**
     * 회의록 IDX로 첨부파일 삭제
     */
    void deleteByReceiptMeetingIdx(Long receiptMeetingIdx);

    /**
     * 회의록 IDX + 첨부파일 종류별 파일 수 조회 (연번 계산용)
     */
    long countByReceiptMeetingIdxAndAttachmentType(Long receiptMeetingIdx, String attachmentType);
}
