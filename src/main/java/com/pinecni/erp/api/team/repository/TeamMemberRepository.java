package com.pinecni.erp.api.team.repository;

import com.pinecni.erp.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * TeamMember Repository
 */
@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    /**
     * 팀별 멤버 목록 조회
     */
    @Query("SELECT m FROM TeamMember m WHERE m.teamIdx = :teamIdx ORDER BY m.joinDate")
    List<TeamMember> findByTeamIdx(Long teamIdx);

    /**
     * 팀별 활성 멤버 목록 조회
     */
    @Query("SELECT m FROM TeamMember m WHERE m.teamIdx = :teamIdx AND m.isActive = 'Y' ORDER BY m.joinDate")
    List<TeamMember> findActiveByTeamIdx(Long teamIdx);

    /**
     * 사용자별 참여 팀 조회
     */
    @Query("SELECT m FROM TeamMember m WHERE m.memberIdx = :memberIdx ORDER BY m.joinDate DESC")
    List<TeamMember> findByMemberIdx(Long memberIdx);

    /**
     * 특정 팀의 특정 멤버 조회
     */
    @Query("SELECT m FROM TeamMember m WHERE m.teamIdx = :teamIdx AND m.memberIdx = :memberIdx")
    Optional<TeamMember> findByTeamIdxAndMemberIdx(Long teamIdx, Long memberIdx);

    /**
     * 역할별 팀 멤버 조회
     */
    @Query("SELECT m FROM TeamMember m WHERE m.teamIdx = :teamIdx AND m.role = :role AND m.isActive = 'Y'")
    List<TeamMember> findByTeamIdxAndRole(Long teamIdx, String role);

    /**
     * 팀 멤버 수 조회
     */
    @Query("SELECT COUNT(m) FROM TeamMember m WHERE m.teamIdx = :teamIdx AND m.isActive = 'Y'")
    Long countActiveByTeamIdx(Long teamIdx);
}
