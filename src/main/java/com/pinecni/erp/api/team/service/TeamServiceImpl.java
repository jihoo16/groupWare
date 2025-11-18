package com.pinecni.erp.api.team.service;

import com.pinecni.erp.api.team.dto.*;
import com.pinecni.erp.api.team.mapper.TeamMapper;
import com.pinecni.erp.api.team.repository.TeamMemberRepository;
import com.pinecni.erp.api.team.repository.TeamRepository;
import com.pinecni.erp.entity.Team;
import com.pinecni.erp.entity.TeamMember;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Team Service Implementation
 * 팀 관리 비즈니스 로직 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamMapper mapper;

    @Override
    public List<TeamDTO> getAllTeams() {
        log.debug("getAllTeams() called");
        return teamRepository.findAll().stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TeamDTO> getActiveTeams() {
        log.debug("getActiveTeams() called");
        return teamRepository.findByIsActive("Y").stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public TeamDTO getTeamById(Long teamIdx) {
        log.debug("getTeamById() called with teamIdx: {}", teamIdx);
        Team team = teamRepository.findById(teamIdx)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다: " + teamIdx));
        return mapper.toDTO(team);
    }

    @Override
    @Transactional
    public TeamDTO createTeam(TeamCreateDTO createDTO, Long createdUserIdx) {
        log.debug("createTeam() called with teamName: {}", createDTO.getTeamName());

        // 필수값 검증
        if (createDTO.getTeamName() == null || createDTO.getTeamName().isEmpty()) {
            throw new IllegalArgumentException("팀 이름은 필수입니다.");
        }
        if (createDTO.getCreatorIdx() == null) {
            throw new IllegalArgumentException("생성자 정보는 필수입니다.");
        }

        // DTO -> Entity 변환
        Team team = mapper.toEntity(createDTO, createdUserIdx);
        team.setCreatedUserIdx(createdUserIdx);

        // 팀 저장
        Team savedTeam = teamRepository.save(team);
        log.debug("Team saved with idx: {}", savedTeam.getIdx());

        // 팀원 저장
        if (createDTO.getMembers() != null && !createDTO.getMembers().isEmpty()) {
            log.debug("Saving {} members for team idx={}", createDTO.getMembers().size(), savedTeam.getIdx());

            for (TeamMemberCreateDTO memberDTO : createDTO.getMembers()) {
                memberDTO.setTeamIdx(savedTeam.getIdx());
                TeamMember member = mapper.toMemberEntity(memberDTO, createdUserIdx);
                member.setCreatedUserIdx(createdUserIdx);
                teamMemberRepository.save(member);
            }
        }

        return mapper.toDTO(savedTeam);
    }

    @Override
    @Transactional
    public TeamDTO updateTeam(Long teamIdx, TeamUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateTeam() called with teamIdx: {}", teamIdx);

        Team team = teamRepository.findById(teamIdx)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다: " + teamIdx));

        // Entity 업데이트
        mapper.updateEntity(team, updateDTO);
        team.setUpdatedUserIdx(updatedUserIdx);

        Team updatedTeam = teamRepository.save(team);
        return mapper.toDTO(updatedTeam);
    }

    @Override
    @Transactional
    public void deleteTeam(Long teamIdx) {
        log.debug("deleteTeam() called with teamIdx: {}", teamIdx);

        Team team = teamRepository.findById(teamIdx)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다: " + teamIdx));

        // 소프트 삭제
        team.setIsActive("N");
        teamRepository.save(team);

        // 팀원도 모두 비활성화
        List<TeamMember> members = teamMemberRepository.findByTeamIdx(teamIdx);
        for (TeamMember member : members) {
            member.setIsActive("N");
            member.setLeaveDate(LocalDateTime.now());
        }
        teamMemberRepository.saveAll(members);

        log.debug("Team {} deleted (soft delete)", teamIdx);
    }

    @Override
    public List<TeamDTO> getTeamsByCreator(Long creatorIdx) {
        log.debug("getTeamsByCreator() called with creatorIdx: {}", creatorIdx);
        return teamRepository.findByCreatorIdx(creatorIdx).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TeamDTO> getTeamsByLeader(Long teamLeaderIdx) {
        log.debug("getTeamsByLeader() called with teamLeaderIdx: {}", teamLeaderIdx);
        return teamRepository.findByTeamLeaderIdx(teamLeaderIdx).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TeamDTO> getTeamsByMember(Long memberIdx) {
        log.debug("getTeamsByMember() called with memberIdx: {}", memberIdx);
        return teamRepository.findByMemberIdx(memberIdx).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TeamDTO> searchTeamsByName(String keyword) {
        log.debug("searchTeamsByName() called with keyword: {}", keyword);
        return teamRepository.searchByTeamName(keyword).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TeamMemberDTO addMember(Long teamIdx, TeamMemberCreateDTO createDTO, Long createdUserIdx) {
        log.debug("addMember() called with teamIdx: {}, memberIdx: {}", teamIdx, createDTO.getMemberIdx());

        // 팀 존재 확인
        Team team = teamRepository.findById(teamIdx)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다: " + teamIdx));

        // 중복 멤버 확인
        teamMemberRepository.findByTeamIdxAndMemberIdx(teamIdx, createDTO.getMemberIdx())
                .ifPresent(existing -> {
                    if ("Y".equals(existing.getIsActive())) {
                        throw new IllegalArgumentException("이미 팀에 속한 멤버입니다.");
                    }
                });

        createDTO.setTeamIdx(teamIdx);
        TeamMember member = mapper.toMemberEntity(createDTO, createdUserIdx);
        member.setCreatedUserIdx(createdUserIdx);

        TeamMember savedMember = teamMemberRepository.save(member);
        return mapper.toMemberDTO(savedMember);
    }

    @Override
    @Transactional
    public void removeMember(Long teamIdx, Long memberIdx) {
        log.debug("removeMember() called with teamIdx: {}, memberIdx: {}", teamIdx, memberIdx);

        TeamMember member = teamMemberRepository.findByTeamIdxAndMemberIdx(teamIdx, memberIdx)
                .orElseThrow(() -> new IllegalArgumentException("팀 멤버를 찾을 수 없습니다."));

        // 소프트 삭제
        member.setIsActive("N");
        member.setLeaveDate(LocalDateTime.now());
        teamMemberRepository.save(member);

        log.debug("Team member removed: teamIdx={}, memberIdx={}", teamIdx, memberIdx);
    }

    @Override
    public List<TeamMemberDTO> getTeamMembers(Long teamIdx) {
        log.debug("getTeamMembers() called with teamIdx: {}", teamIdx);
        return teamMemberRepository.findByTeamIdx(teamIdx).stream()
                .map(mapper::toMemberDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TeamMemberDTO> getActiveTeamMembers(Long teamIdx) {
        log.debug("getActiveTeamMembers() called with teamIdx: {}", teamIdx);
        return teamMemberRepository.findActiveByTeamIdx(teamIdx).stream()
                .map(mapper::toMemberDTO)
                .collect(Collectors.toList());
    }
}
