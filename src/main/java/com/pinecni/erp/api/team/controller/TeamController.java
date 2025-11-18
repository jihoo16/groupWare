package com.pinecni.erp.api.team.controller;

import com.pinecni.erp.api.team.dto.*;
import com.pinecni.erp.api.team.service.TeamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 팀 관리 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    /**
     * 전체 팀 목록 조회
     * GET /api/teams
     * GET /api/teams?active=Y (활성 팀만)
     */
    @GetMapping
    public ResponseEntity<List<TeamDTO>> getAllTeams(
            @RequestParam(required = false) String active) {
        log.debug("GET /api/teams - active: {}", active);

        List<TeamDTO> teams;
        if ("Y".equals(active)) {
            teams = teamService.getActiveTeams();
        } else {
            teams = teamService.getAllTeams();
        }

        return ResponseEntity.ok(teams);
    }

    /**
     * 팀 상세 조회
     * GET /api/teams/{teamIdx}
     */
    @GetMapping("/{teamIdx}")
    public ResponseEntity<TeamDTO> getTeamById(@PathVariable Long teamIdx) {
        log.debug("GET /api/teams/{}", teamIdx);

        try {
            TeamDTO team = teamService.getTeamById(teamIdx);
            return ResponseEntity.ok(team);
        } catch (IllegalArgumentException e) {
            log.error("팀 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 생성자별 팀 목록 조회
     * GET /api/teams/creator/{createdUserIdx}
     */
    @GetMapping("/creator/{createdUserIdx}")
    public ResponseEntity<List<TeamDTO>> getTeamsByCreator(@PathVariable Long createdUserIdx) {
        log.debug("GET /api/teams/creator/{}", createdUserIdx);
        List<TeamDTO> teams = teamService.getTeamsByCreator(createdUserIdx);
        return ResponseEntity.ok(teams);
    }

    /**
     * 팀 리더별 팀 목록 조회
     * GET /api/teams/leader/{leaderIdx}
     */
    @GetMapping("/leader/{leaderIdx}")
    public ResponseEntity<List<TeamDTO>> getTeamsByLeader(@PathVariable Long leaderIdx) {
        log.debug("GET /api/teams/leader/{}", leaderIdx);
        List<TeamDTO> teams = teamService.getTeamsByLeader(leaderIdx);
        return ResponseEntity.ok(teams);
    }

    /**
     * 사용자가 속한 팀 목록 조회
     * GET /api/teams/member/{memberIdx}
     */
    @GetMapping("/member/{memberIdx}")
    public ResponseEntity<List<TeamDTO>> getTeamsByMember(@PathVariable Long memberIdx) {
        log.debug("GET /api/teams/member/{}", memberIdx);
        List<TeamDTO> teams = teamService.getTeamsByMember(memberIdx);
        return ResponseEntity.ok(teams);
    }

    /**
     * 팀 이름으로 검색
     * GET /api/teams/search?keyword=xxx
     */
    @GetMapping("/search")
    public ResponseEntity<List<TeamDTO>> searchTeams(@RequestParam String keyword) {
        log.debug("GET /api/teams/search - keyword: {}", keyword);
        List<TeamDTO> teams = teamService.searchTeamsByName(keyword);
        return ResponseEntity.ok(teams);
    }

    /**
     * 팀 생성
     * POST /api/teams
     */
    @PostMapping
    public ResponseEntity<TeamDTO> createTeam(@RequestBody TeamCreateDTO createDTO) {
        log.debug("POST /api/teams - teamName: {}", createDTO.getTeamName());

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

        try {
            TeamDTO team = teamService.createTeam(createDTO, currentUserIdx);
            return ResponseEntity.status(HttpStatus.CREATED).body(team);
        } catch (IllegalArgumentException e) {
            log.error("팀 생성 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 팀 수정
     * PUT /api/teams/{teamIdx}
     */
    @PutMapping("/{teamIdx}")
    public ResponseEntity<TeamDTO> updateTeam(
            @PathVariable Long teamIdx,
            @RequestBody TeamUpdateDTO updateDTO) {
        log.debug("PUT /api/teams/{} - teamName: {}", teamIdx, updateDTO.getTeamName());

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

        try {
            TeamDTO team = teamService.updateTeam(teamIdx, updateDTO, currentUserIdx);
            return ResponseEntity.ok(team);
        } catch (IllegalArgumentException e) {
            log.error("팀 수정 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 팀 삭제 (소프트 삭제)
     * DELETE /api/teams/{teamIdx}
     */
    @DeleteMapping("/{teamIdx}")
    public ResponseEntity<Void> deleteTeam(@PathVariable Long teamIdx) {
        log.debug("DELETE /api/teams/{}", teamIdx);

        try {
            teamService.deleteTeam(teamIdx);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("팀 삭제 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 팀 멤버 목록 조회
     * GET /api/teams/{teamIdx}/members
     * GET /api/teams/{teamIdx}/members?active=Y (활성 멤버만)
     */
    @GetMapping("/{teamIdx}/members")
    public ResponseEntity<List<TeamMemberDTO>> getTeamMembers(
            @PathVariable Long teamIdx,
            @RequestParam(required = false) String active) {
        log.debug("GET /api/teams/{}/members - active: {}", teamIdx, active);

        List<TeamMemberDTO> members;
        if ("Y".equals(active)) {
            members = teamService.getActiveTeamMembers(teamIdx);
        } else {
            members = teamService.getTeamMembers(teamIdx);
        }

        return ResponseEntity.ok(members);
    }

    /**
     * 팀 멤버 추가
     * POST /api/teams/{teamIdx}/members
     */
    @PostMapping("/{teamIdx}/members")
    public ResponseEntity<TeamMemberDTO> addMember(
            @PathVariable Long teamIdx,
            @RequestBody TeamMemberCreateDTO createDTO) {
        log.debug("POST /api/teams/{}/members - memberIdx: {}", teamIdx, createDTO.getMemberIdx());

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

        try {
            TeamMemberDTO member = teamService.addMember(teamIdx, createDTO, currentUserIdx);
            return ResponseEntity.status(HttpStatus.CREATED).body(member);
        } catch (IllegalArgumentException e) {
            log.error("팀 멤버 추가 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 팀 멤버 제거
     * DELETE /api/teams/{teamIdx}/members/{memberIdx}
     */
    @DeleteMapping("/{teamIdx}/members/{memberIdx}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long teamIdx,
            @PathVariable Long memberIdx) {
        log.debug("DELETE /api/teams/{}/members/{}", teamIdx, memberIdx);

        try {
            teamService.removeMember(teamIdx, memberIdx);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("팀 멤버 제거 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}
