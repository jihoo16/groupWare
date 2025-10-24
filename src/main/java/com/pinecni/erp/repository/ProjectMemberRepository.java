package com.pinecni.erp.repository;

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
            "ORDER BY m.role, m.joinDate")
    List<ProjectMember> findByProjectIdx(Long projectIdx);

    /**
     * 사용자별 참여 프로젝트 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.userIdx = :userIdx " +
            "ORDER BY m.joinDate DESC")
    List<ProjectMember> findByUserIdx(Long userIdx);

    /**
     * 현재 활성 프로젝트 멤버 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.projectIdx = :projectIdx " +
            "AND (m.leaveDate IS NULL OR m.leaveDate >= :currentDate)")
    List<ProjectMember> findActiveByProjectIdx(Long projectIdx, LocalDate currentDate);

    /**
     * 역할별 프로젝트 멤버 조회
     */
    @Query("SELECT m FROM ProjectMember m WHERE m.projectIdx = :projectIdx AND m.role = :role")
    List<ProjectMember> findByProjectIdxAndRole(Long projectIdx, String role);
}
