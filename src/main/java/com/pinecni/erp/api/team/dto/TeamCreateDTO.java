package com.pinecni.erp.api.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 팀 생성 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamCreateDTO {

    /**
     * 팀 이름
     */
    private String teamName;

    /**
     * 팀 설명
     */
    private String teamDescription;

    /**
     * 팀 유형 (custom/project/temporary)
     */
    private String teamType;

    /**
     * 생성자 IDX
     */
    private Long createdUserIdx;

    /**
     * 팀 리더 IDX
     */
    private Long teamLeaderIdx;

    /**
     * 팀원 목록
     */
    private List<TeamMemberCreateDTO> members;
}
