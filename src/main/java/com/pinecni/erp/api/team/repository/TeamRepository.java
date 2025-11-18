package com.pinecni.erp.api.team.repository;

import com.pinecni.erp.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Team Repository
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    /**
     * 활성화된 팀 목록 조회
     */
    @Query("SELECT t FROM Team t WHERE t.isActive = :isActive ORDER BY t.createdAt DESC")
    List<Team> findByIsActive(String isActive);

    /**
     * 생성자별 팀 목록 조회
     */
    @Query("SELECT t FROM Team t WHERE t.creatorIdx = :creatorIdx ORDER BY t.createdAt DESC")
    List<Team> findByCreatorIdx(Long creatorIdx);

    /**
     * 팀 리더별 팀 목록 조회
     */
    @Query("SELECT t FROM Team t WHERE t.teamLeaderIdx = :teamLeaderIdx ORDER BY t.createdAt DESC")
    List<Team> findByTeamLeaderIdx(Long teamLeaderIdx);

    /**
     * 팀 유형별 팀 목록 조회
     */
    @Query("SELECT t FROM Team t WHERE t.teamType = :teamType AND t.isActive = 'Y' ORDER BY t.createdAt DESC")
    List<Team> findByTeamType(String teamType);

    /**
     * 특정 사용자가 속한 팀 목록 조회 (멤버로 참여 중인 팀)
     */
    @Query("SELECT DISTINCT t FROM Team t JOIN t.members m WHERE m.memberIdx = :memberIdx AND m.isActive = 'Y' ORDER BY t.createdAt DESC")
    List<Team> findByMemberIdx(Long memberIdx);

    /**
     * 팀 이름으로 검색
     */
    @Query("SELECT t FROM Team t WHERE t.teamName LIKE %:keyword% AND t.isActive = 'Y' ORDER BY t.createdAt DESC")
    List<Team> searchByTeamName(String keyword);

    /**
     * 전체 활성 팀 조회 (멤버 포함)
     */
    @Query("SELECT DISTINCT t FROM Team t LEFT JOIN FETCH t.members WHERE t.isActive = 'Y' ORDER BY t.createdAt DESC")
    List<Team> findAllActiveWithMembers();
}
