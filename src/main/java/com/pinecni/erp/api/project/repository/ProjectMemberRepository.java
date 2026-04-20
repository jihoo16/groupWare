package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * ProjectMember Repository
 */
@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    /**
     * 프로젝트별 팀원 목록 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.projectIdx = :projectIdx " +
            "ORDER BY m.role, m.participationStartDate")
    List<ProjectMember> findByProjectIdx(Long projectIdx);

    /**
     * 사용자별 참여 프로젝트 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.employeeIdx = :employeeIdx " +
            "ORDER BY m.participationStartDate DESC")
    List<ProjectMember> findByEmployeeIdx(Long employeeIdx);

    /**
     * 현재 활성 프로젝트 멤버 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.projectIdx = :projectIdx " +
            "AND (m.participationEndDate IS NULL OR m.participationEndDate >= :currentDate)")
    List<ProjectMember> findActiveByProjectIdx(Long projectIdx, LocalDate currentDate);

    /**
     * 역할별 프로젝트 멤버 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.projectIdx = :projectIdx AND m.role = :role")
    List<ProjectMember> findByProjectIdxAndRole(Long projectIdx, String role);

    /**
     * 활성 멤버 조회 (isActive = true)
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.projectIdx = :projectIdx AND m.isActive = true")
    List<ProjectMember> findActiveMembers(Long projectIdx);

    /**
     * 특정 사용자가 프로젝트 멤버인지 확인 (역할 무관)
     */
    @Query("SELECT COUNT(m) > 0 FROM ProjectMember m WHERE m.projectIdx = :projectIdx AND m.employeeIdx = :employeeIdx AND m.isActive = true")
    boolean existsByProjectIdxAndEmployeeIdx(@Param("projectIdx") Long projectIdx, @Param("employeeIdx") Long employeeIdx);

    /**
     * 특정 프로젝트에서 해당 사용자가 지정된 역할 중 하나를 가지고 있는지 확인
     */
    @Query("SELECT COUNT(m) > 0 FROM ProjectMember m " +
            "WHERE m.projectIdx = :projectIdx AND m.employeeIdx = :employeeIdx AND m.role IN :roles")
    boolean existsByProjectIdxAndEmployeeIdxAndRoleIn(Long projectIdx, Long employeeIdx, List<String> roles);

    // ==============================================
    // 참여기간 검증용 메서드 (증빙 문서 작성/수정 시 사용)
    // ==============================================

    /**
     * 특정 날짜에 활성 상태인 프로젝트 멤버 조회
     * - isActive = true
     * - participationStartDate <= date
     * - participationEndDate IS NULL OR participationEndDate >= date
     */
    @Query("""
            SELECT m FROM ProjectMember m
            WHERE m.projectIdx = :projectIdx
              AND m.isActive = true
              AND m.participationStartDate <= :date
              AND (m.participationEndDate IS NULL OR m.participationEndDate >= :date)
            """)
    List<ProjectMember> findActiveByProjectIdxAndDate(
            @Param("projectIdx") Long projectIdx,
            @Param("date") LocalDate date);

    /**
     * 특정 기간 [startDate, endDate] 전 구간에 활성인 프로젝트 멤버 조회
     * (출장처럼 기간 단위 검증이 필요한 경우 사용 — 전 기간 활성이어야 함)
     * - isActive = true
     * - participationStartDate <= startDate
     * - participationEndDate IS NULL OR participationEndDate >= endDate
     */
    @Query("""
            SELECT m FROM ProjectMember m
            WHERE m.projectIdx = :projectIdx
              AND m.isActive = true
              AND m.participationStartDate <= :startDate
              AND (m.participationEndDate IS NULL OR m.participationEndDate >= :endDate)
            """)
    List<ProjectMember> findActiveByProjectIdxAndDateRange(
            @Param("projectIdx") Long projectIdx,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    /**
     * 특정 사용자가 프로젝트에 특정 날짜 기준 활성 참여중인지 확인
     */
    @Query("""
            SELECT COUNT(m) > 0 FROM ProjectMember m
            WHERE m.projectIdx = :projectIdx
              AND m.employeeIdx = :employeeIdx
              AND m.isActive = true
              AND m.participationStartDate <= :date
              AND (m.participationEndDate IS NULL OR m.participationEndDate >= :date)
            """)
    boolean isMemberActiveOn(
            @Param("projectIdx") Long projectIdx,
            @Param("employeeIdx") Long employeeIdx,
            @Param("date") LocalDate date);

    /**
     * 특정 사용자가 프로젝트에 [startDate, endDate] 전 구간 활성 참여중인지 확인
     */
    @Query("""
            SELECT COUNT(m) > 0 FROM ProjectMember m
            WHERE m.projectIdx = :projectIdx
              AND m.employeeIdx = :employeeIdx
              AND m.isActive = true
              AND m.participationStartDate <= :startDate
              AND (m.participationEndDate IS NULL OR m.participationEndDate >= :endDate)
            """)
    boolean isMemberActiveDuring(
            @Param("projectIdx") Long projectIdx,
            @Param("employeeIdx") Long employeeIdx,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
