package com.pinecni.erp.api.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 팀 수정 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamUpdateDTO {

    /**
     * 팀 이름
     */
    private String teamName;

    /**
     * 팀 설명
     */
    private String teamDescription;

    /**
     * 팀 리더 IDX
     */
    private Long teamLeaderIdx;

    /**
     * 활성화 여부
     */
    private String isActive;

    /**
     * 팀 색상 (Hex 코드)
     */
    private String teamColor;
}
