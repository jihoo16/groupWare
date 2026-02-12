package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
     * 특정 프로젝트에서 해당 사용자가 지정된 역할 중 하나를 가지고 있는지 확인
     */
    @Query("SELECT COUNT(m) > 0 FROM ProjectMember m " +
            "WHERE m.projectIdx = :projectIdx AND m.employeeIdx = :employeeIdx AND m.role IN :roles")
    boolean existsByProjectIdxAndEmployeeIdxAndRoleIn(Long projectIdx, Long employeeIdx, List<String> roles);
}
