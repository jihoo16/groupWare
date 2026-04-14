package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.WeeklyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * WeeklyReport Repository
 */
@Repository
public interface WeeklyReportRepository extends JpaRepository<WeeklyReport, Long> {

    /**
     * 특정 사용자의 보고서 목록 조회 (최신순)
     */
    List<WeeklyReport> findByUserIdxOrderByCreatedAtDesc(Long userIdx);

    /**
     * 특정 프로젝트의 보고서 목록 조회
     */
    List<WeeklyReport> findByProjectIdx(Long projectIdx);

    /**
     * 보고 기간으로 조회
     */
    List<WeeklyReport> findByReportPeriod(String reportPeriod);

    /**
     * 사용자 + 기간으로 조회 (중복 체크용)
     */
    Optional<WeeklyReport> findByUserIdxAndReportPeriod(Long userIdx, String reportPeriod);

    /**
     * 전체 주간업무보고 조회 (최신순, Project fetch join)
     */
    @Query("SELECT w FROM WeeklyReport w LEFT JOIN FETCH w.project ORDER BY w.createdAt DESC")
    List<WeeklyReport> findAllOrderByCreatedAtDesc();

    /**
     * documentIdx로 조회 (Project fetch join)
     */
    @Query("SELECT w FROM WeeklyReport w LEFT JOIN FETCH w.project WHERE w.documentIdx = :documentIdx")
    Optional<WeeklyReport> findByDocumentIdx(Long documentIdx);

    /**
     * ID로 조회 (Project fetch join)
     */
    @Query("SELECT w FROM WeeklyReport w LEFT JOIN FETCH w.project WHERE w.id = :id")
    Optional<WeeklyReport> findByIdWithProject(Long id);

    /**
     * 특정 사용자의 보고서 목록 조회 (최신순, Project fetch join)
     */
    @Query("SELECT w FROM WeeklyReport w LEFT JOIN FETCH w.project WHERE w.userIdx = :userIdx ORDER BY w.createdAt DESC")
    List<WeeklyReport> findByUserIdxWithProject(Long userIdx);

    /**
     * 특정 프로젝트의 보고서 목록 조회 (Project fetch join)
     */
    @Query("SELECT w FROM WeeklyReport w LEFT JOIN FETCH w.project WHERE w.projectIdx = :projectIdx")
    List<WeeklyReport> findByProjectIdxWithProject(Long projectIdx);

    /**
     * 프로젝트 + 보고기간 시작일 패턴으로 조회 (이전주 차주계획 조회용)
     * weekStartPattern: "YYYY.MM.DD" 형식 (예: "2026.04.06")
     */
    @Query("SELECT w FROM WeeklyReport w WHERE w.projectIdx = :projectIdx AND w.reportPeriod LIKE CONCAT(:weekStartPattern, '%') ORDER BY w.createdAt DESC")
    List<WeeklyReport> findByProjectIdxAndReportPeriodStartsWith(Long projectIdx, String weekStartPattern);
}
