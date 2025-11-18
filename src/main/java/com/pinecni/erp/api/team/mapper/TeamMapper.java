package com.pinecni.erp.api.team.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.team.dto.*;
import com.pinecni.erp.api.team.repository.TeamMemberRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Team;
import com.pinecni.erp.entity.TeamMember;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Team Entity <-> DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class TeamMapper {

    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CodeRepository codeRepository;

    /**
     * Team Entity -> DTO 변환
     */
    public TeamDTO toDTO(Team team) {
        if (team == null) {
            return null;
        }

        TeamDTO dto = TeamDTO.builder()
                .idx(team.getIdx())
                .teamName(team.getTeamName())
                .teamDescription(team.getTeamDescription())
                .teamType(team.getTeamType())
                .createdUserIdx(team.getCreatedUserIdx())
                .teamLeaderIdx(team.getTeamLeaderIdx())
                .isActive(team.getIsActive())
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();

        // 생성자 이름 조회
        if (team.getCreatedUserIdx() != null) {
            userRepository.findById(team.getCreatedUserIdx())
                    .ifPresent(user -> dto.setCreatorName(user.getEmpName()));
        }

        // 팀 리더 이름 조회
        if (team.getTeamLeaderIdx() != null) {
            userRepository.findById(team.getTeamLeaderIdx())
                    .ifPresent(user -> dto.setTeamLeaderName(user.getEmpName()));
        }

        // 팀원 목록 조회
        List<TeamMember> members = teamMemberRepository.findActiveByTeamIdx(team.getIdx());
        dto.setMembers(members.stream()
                .map(this::toMemberDTO)
                .collect(Collectors.toList()));
        dto.setMemberCount(members.size());

        return dto;
    }

    /**
     * TeamMember Entity -> DTO 변환
     */
    public TeamMemberDTO toMemberDTO(TeamMember member) {
        if (member == null) {
            return null;
        }

        TeamMemberDTO dto = TeamMemberDTO.builder()
                .idx(member.getIdx())
                .teamIdx(member.getTeamIdx())
                .memberIdx(member.getMemberIdx())
                .role(member.getRole())
                .joinDate(member.getJoinDate())
                .leaveDate(member.getLeaveDate())
                .isActive(member.getIsActive())
                .build();

        // 멤버 정보 조회
        if (member.getMemberIdx() != null) {
            userRepository.findById(member.getMemberIdx())
                    .ifPresent(user -> {
                        dto.setMemberName(user.getEmpName());
                        dto.setMemberDept(user.getEmpDept());
                        dto.setMemberPosition(user.getEmpPosition());

                        // 부서 코드명 조회
                        if (user.getEmpDept() != null) {
                            codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                                    .ifPresent(code -> dto.setMemberDeptName(code.getCodeName()));
                        }

                        // 직급 코드명 조회
                        if (user.getEmpPosition() != null) {
                            codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                                    .ifPresent(code -> dto.setMemberPositionName(code.getCodeName()));
                        }
                    });
        }

        return dto;
    }

    /**
     * TeamCreateDTO -> Entity 변환
     */
    public Team toEntity(TeamCreateDTO createDTO, Long createdUserIdx) {
        Team team = Team.builder()
                .teamName(createDTO.getTeamName())
                .teamDescription(createDTO.getTeamDescription())
                .teamType(createDTO.getTeamType() != null ? createDTO.getTeamType() : "custom")
                .teamLeaderIdx(createDTO.getTeamLeaderIdx())
                .isActive("Y")
                .build();

        // BaseEntity의 createdUserIdx 설정
        team.setCreatedUserIdx(createDTO.getCreatedUserIdx());

        return team;
    }

    /**
     * TeamMemberCreateDTO -> Entity 변환
     */
    public TeamMember toMemberEntity(TeamMemberCreateDTO createDTO, Long createdUserIdx) {
        return TeamMember.builder()
                .teamIdx(createDTO.getTeamIdx())
                .memberIdx(createDTO.getMemberIdx())
                .role(createDTO.getRole())
                .joinDate(LocalDateTime.now())
                .isActive("Y")
                .build();
    }

    /**
     * Entity 업데이트 (TeamUpdateDTO 적용)
     */
    public void updateEntity(Team team, TeamUpdateDTO updateDTO) {
        if (updateDTO.getTeamName() != null) {
            team.setTeamName(updateDTO.getTeamName());
        }
        if (updateDTO.getTeamDescription() != null) {
            team.setTeamDescription(updateDTO.getTeamDescription());
        }
        if (updateDTO.getTeamType() != null) {
            team.setTeamType(updateDTO.getTeamType());
        }
        if (updateDTO.getTeamLeaderIdx() != null) {
            team.setTeamLeaderIdx(updateDTO.getTeamLeaderIdx());
        }
        if (updateDTO.getIsActive() != null) {
            team.setIsActive(updateDTO.getIsActive());
        }
    }
}
