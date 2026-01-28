package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptMeetingOfficialPdf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ReceiptMeetingOfficialPdf Repository
 */
@Repository
public interface ReceiptMeetingOfficialPdfRepository extends JpaRepository<ReceiptMeetingOfficialPdf, Long> {

    /**
     * 회의록 IDX로 PDF 파일 조회
     */
    Optional<ReceiptMeetingOfficialPdf> findByReceiptMeetingIdx(Long receiptMeetingIdx);

    /**
     * 회의록 IDX로 모든 PDF 파일 조회 (최신순)
     */
    @Query("SELECT f FROM ReceiptMeetingOfficialPdf f WHERE f.receiptMeetingIdx = :receiptMeetingIdx " +
            "ORDER BY f.createdAt DESC")
    List<ReceiptMeetingOfficialPdf> findAllByReceiptMeetingIdx(Long receiptMeetingIdx);

    /**
     * 회의록 IDX로 가장 최근 PDF 파일 조회
     */
    @Query("SELECT f FROM ReceiptMeetingOfficialPdf f WHERE f.receiptMeetingIdx = :receiptMeetingIdx " +
            "ORDER BY f.createdAt DESC LIMIT 1")
    Optional<ReceiptMeetingOfficialPdf> findLatestByReceiptMeetingIdx(Long receiptMeetingIdx);
}
