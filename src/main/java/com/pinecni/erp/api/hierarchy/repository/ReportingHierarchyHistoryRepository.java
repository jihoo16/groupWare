package com.pinecni.erp.api.hierarchy.repository;

import com.pinecni.erp.entity.ReportingHierarchyHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 보고체계 변경 이력 Repository
 */
@Repository
public interface ReportingHierarchyHistoryRepository extends JpaRepository<ReportingHierarchyHistory, Long> {

    /**
     * 특정 직원의 보고체계 변경 이력 조회 (최신순)
     */
    @Query("SELECT h FROM ReportingHierarchyHistory h WHERE h.empIdx = :empIdx ORDER BY h.changeDate DESC")
    List<ReportingHierarchyHistory> findByEmpIdxOrderByChangeDateDesc(Long empIdx);

    /**
     * 특정 직원의 최근 N개 이력 조회
     */
    @Query("SELECT h FROM ReportingHierarchyHistory h WHERE h.empIdx = :empIdx ORDER BY h.changeDate DESC LIMIT :limit")
    List<ReportingHierarchyHistory> findTopNByEmpIdx(Long empIdx, int limit);
}
