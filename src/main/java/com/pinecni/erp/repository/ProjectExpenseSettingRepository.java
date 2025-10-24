package com.pinecni.erp.repository;

import com.pinecni.erp.entity.ProjectExpenseSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ProjectExpenseSetting Repository
 */
@Repository
public interface ProjectExpenseSettingRepository extends JpaRepository<ProjectExpenseSetting, Long> {

    /**
     * 프로젝트별 경비 설정 조회
     */
    @Query("SELECT s FROM ProjectExpenseSetting s WHERE s.projectIdx = :projectIdx " +
            "ORDER BY s.positionCode")
    List<ProjectExpenseSetting> findByProjectIdx(Long projectIdx);

    /**
     * 프로젝트 및 직급별 경비 설정 조회
     */
    Optional<ProjectExpenseSetting> findByProjectIdxAndPositionCode(Long projectIdx, String positionCode);

    /**
     * 직급별 설정 조회 (모든 프로젝트)
     */
    @Query("SELECT s FROM ProjectExpenseSetting s WHERE s.positionCode = :positionCode")
    List<ProjectExpenseSetting> findByPositionCode(String positionCode);
}
