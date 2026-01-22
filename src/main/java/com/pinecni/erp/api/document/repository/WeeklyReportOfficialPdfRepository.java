package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.WeeklyReportOfficialPdf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WeeklyReportOfficialPdf Repository
 */
@Repository
public interface WeeklyReportOfficialPdfRepository extends JpaRepository<WeeklyReportOfficialPdf, Long> {

    /**
     * 문서 IDX로 PDF 파일 조회
     */
    Optional<WeeklyReportOfficialPdf> findByDocumentIdx(Long documentIdx);

    /**
     * 문서 IDX로 모든 PDF 파일 조회 (최신순)
     */
    @Query("SELECT f FROM WeeklyReportOfficialPdf f WHERE f.documentIdx = :documentIdx " +
            "ORDER BY f.createdAt DESC")
    List<WeeklyReportOfficialPdf> findAllByDocumentIdx(Long documentIdx);

    /**
     * 문서 IDX로 가장 최근 PDF 파일 조회
     */
    @Query("SELECT f FROM WeeklyReportOfficialPdf f WHERE f.documentIdx = :documentIdx " +
            "ORDER BY f.createdAt DESC LIMIT 1")
    Optional<WeeklyReportOfficialPdf> findLatestByDocumentIdx(Long documentIdx);
}
