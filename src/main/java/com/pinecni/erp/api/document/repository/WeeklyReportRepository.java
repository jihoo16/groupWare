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
     * 전체 주간업무보고 조회 (최신순)
     */
    @Query("SELECT w FROM WeeklyReport w ORDER BY w.createdAt DESC")
    List<WeeklyReport> findAllOrderByCreatedAtDesc();
}
