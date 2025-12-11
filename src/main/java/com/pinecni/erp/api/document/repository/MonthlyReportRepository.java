package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.MonthlyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * MonthlyReport Repository
 */
@Repository
public interface MonthlyReportRepository extends JpaRepository<MonthlyReport, Long> {

    /**
     * 특정 사용자의 보고서 목록 조회 (최신순)
     */
    List<MonthlyReport> findByUserIdxOrderByCreatedAtDesc(Long userIdx);

    /**
     * 특정 프로젝트의 보고서 목록 조회
     */
    List<MonthlyReport> findByProjectIdx(Long projectIdx);

    /**
     * 보고 월로 조회
     */
    List<MonthlyReport> findByReportMonth(String reportMonth);

    /**
     * 사용자 + 월로 조회 (중복 체크용)
     */
    Optional<MonthlyReport> findByUserIdxAndReportMonth(Long userIdx, String reportMonth);

    /**
     * 전체 월간업무보고 조회 (최신순)
     */
    @Query("SELECT m FROM MonthlyReport m ORDER BY m.createdAt DESC")
    List<MonthlyReport> findAllOrderByCreatedAtDesc();
}
