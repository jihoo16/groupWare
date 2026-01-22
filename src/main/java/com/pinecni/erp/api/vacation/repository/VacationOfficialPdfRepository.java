package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationOfficialPdf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * VacationOfficialPdf Repository
 */
@Repository
public interface VacationOfficialPdfRepository extends JpaRepository<VacationOfficialPdf, Long> {

    /**
     * 문서 IDX로 PDF 파일 조회
     */
    Optional<VacationOfficialPdf> findByDocumentIdx(Long documentIdx);

    /**
     * 문서 IDX로 모든 PDF 파일 조회 (최신순)
     */
    @Query("SELECT f FROM VacationOfficialPdf f WHERE f.documentIdx = :documentIdx " +
            "ORDER BY f.createdAt DESC")
    List<VacationOfficialPdf> findAllByDocumentIdx(Long documentIdx);

    /**
     * 문서 IDX로 가장 최근 PDF 파일 조회
     */
    @Query("SELECT f FROM VacationOfficialPdf f WHERE f.documentIdx = :documentIdx " +
            "ORDER BY f.createdAt DESC LIMIT 1")
    Optional<VacationOfficialPdf> findLatestByDocumentIdx(Long documentIdx);
}
