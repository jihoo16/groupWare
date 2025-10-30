package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ProjectHistory Repository
 */
@Repository
public interface ProjectHistoryRepository extends JpaRepository<ProjectHistory, Long> {

    /**
     * 프로젝트별 이력 조회 (최신순)
     */
    @Query("SELECT h FROM ProjectHistory h WHERE h.projectIdx = :projectIdx " +
            "ORDER BY h.changedAt DESC")
    List<ProjectHistory> findByProjectIdx(Long projectIdx);

    /**
     * 액션 타입별 이력 조회
     */
    @Query("SELECT h FROM ProjectHistory h WHERE h.projectIdx = :projectIdx " +
            "AND h.actionType = :actionType ORDER BY h.changedAt DESC")
    List<ProjectHistory> findByProjectIdxAndActionType(Long projectIdx, String actionType);

    /**
     * 사용자별 변경 이력 조회
     */
    @Query("SELECT h FROM ProjectHistory h WHERE h.changedUserIdx = :userIdx " +
            "ORDER BY h.changedAt DESC")
    List<ProjectHistory> findByChangedUserIdx(Long userIdx);

    /**
     * 기간별 이력 조회
     */
    @Query("SELECT h FROM ProjectHistory h WHERE h.projectIdx = :projectIdx " +
            "AND h.changedAt BETWEEN :startDate AND :endDate ORDER BY h.changedAt DESC")
    List<ProjectHistory> findByProjectIdxAndDateRange(Long projectIdx,
                                                       LocalDateTime startDate,
                                                       LocalDateTime endDate);
}
