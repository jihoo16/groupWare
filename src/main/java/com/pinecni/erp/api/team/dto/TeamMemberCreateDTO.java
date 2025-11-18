package com.pinecni.erp.api.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 팀 멤버 생성 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberCreateDTO {

    /**
     * 팀 IDX
     */
    private Long teamIdx;

    /**
     * 멤버 IDX (User.idx)
     */
    private Long memberIdx;

    /**
     * 역할
     */
    private String role;
}
