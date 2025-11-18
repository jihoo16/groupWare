package com.pinecni.erp.api.team.service;

import com.pinecni.erp.api.team.dto.*;

import java.util.List;

/**
 * Team Service Interface
 * 팀 관리 비즈니스 로직 정의
 */
public interface TeamService {

    /**
     * 전체 팀 목록 조회
     */
    List<TeamDTO> getAllTeams();

    /**
     * 활성화된 팀 목록 조회
     */
    List<TeamDTO> getActiveTeams();

    /**
     * 팀 상세 조회
     */
    TeamDTO getTeamById(Long teamIdx);

    /**
     * 팀 생성
     */
    TeamDTO createTeam(TeamCreateDTO createDTO, Long createdUserIdx);

    /**
     * 팀 수정
     */
    TeamDTO updateTeam(Long teamIdx, TeamUpdateDTO updateDTO, Long updatedUserIdx);

    /**
     * 팀 삭제 (소프트 삭제)
     */
    void deleteTeam(Long teamIdx);

    /**
     * 생성자별 팀 목록 조회
     */
    List<TeamDTO> getTeamsByCreator(Long creatorIdx);

    /**
     * 팀 리더별 팀 목록 조회
     */
    List<TeamDTO> getTeamsByLeader(Long teamLeaderIdx);

    /**
     * 사용자가 속한 팀 목록 조회
     */
    List<TeamDTO> getTeamsByMember(Long memberIdx);

    /**
     * 팀 이름으로 검색
     */
    List<TeamDTO> searchTeamsByName(String keyword);

    /**
     * 팀 멤버 추가
     */
    TeamMemberDTO addMember(Long teamIdx, TeamMemberCreateDTO createDTO, Long createdUserIdx);

    /**
     * 팀 멤버 제거
     */
    void removeMember(Long teamIdx, Long memberIdx);

    /**
     * 팀 멤버 목록 조회
     */
    List<TeamMemberDTO> getTeamMembers(Long teamIdx);

    /**
     * 활성 팀 멤버 목록 조회
     */
    List<TeamMemberDTO> getActiveTeamMembers(Long teamIdx);
}
