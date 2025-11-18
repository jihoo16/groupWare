package com.pinecni.erp.api.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 팀 정보 DTO (조회용)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDTO {

    /**
     * 팀 IDX
     */
    private Long idx;

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
    private Long creatorIdx;

    /**
     * 생성자 이름
     */
    private String creatorName;

    /**
     * 팀 리더 IDX
     */
    private Long teamLeaderIdx;

    /**
     * 팀 리더 이름
     */
    private String teamLeaderName;

    /**
     * 활성화 여부
     */
    private String isActive;

    /**
     * 생성일
     */
    private LocalDateTime createdAt;

    /**
     * 수정일
     */
    private LocalDateTime updatedAt;

    /**
     * 팀원 목록
     */
    private List<TeamMemberDTO> members;

    /**
     * 팀원 수
     */
    private Integer memberCount;
}
