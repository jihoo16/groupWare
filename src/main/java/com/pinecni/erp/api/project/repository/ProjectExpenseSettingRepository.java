package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectExpenseSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ProjectExpenseSetting Repository
 * 새 구조: 프로젝트 + 직급 + 경비항목 조합으로 저장
 */
@Repository
public interface ProjectExpenseSettingRepository extends JpaRepository<ProjectExpenseSetting, Long> {

    /**
     * 프로젝트별 경비 설정 조회 (모든 직급, 모든 경비 항목)
     */
    @Query("SELECT s FROM ProjectExpenseSetting s WHERE s.projectIdx = :projectIdx " +
            "ORDER BY s.positionCode, s.expenseItemName")
    List<ProjectExpenseSetting> findByProjectIdx(Long projectIdx);

    /**
     * 프로젝트 + 직급 + 경비항목으로 조회
     */
    Optional<ProjectExpenseSetting> findByProjectIdxAndPositionCodeAndExpenseItemName(
            Long projectIdx, String positionCode, String expenseItemName);

    /**
     * 프로젝트 + 직급별 경비 설정 조회 (모든 경비 항목)
     */
    List<ProjectExpenseSetting> findByProjectIdxAndPositionCode(Long projectIdx, String positionCode);

    /**
     * 직급별 설정 조회 (모든 프로젝트)
     */
    @Query("SELECT s FROM ProjectExpenseSetting s WHERE s.positionCode = :positionCode")
    List<ProjectExpenseSetting> findByPositionCode(String positionCode);

    /**
     * 프로젝트별 경비 설정 삭제
     */
    @Modifying
    @Query("DELETE FROM ProjectExpenseSetting s WHERE s.projectIdx = :projectIdx")
    void deleteByProjectIdx(Long projectIdx);
}
