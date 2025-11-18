package com.pinecni.erp.api.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 팀 멤버 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberDTO {

    /**
     * 팀 멤버 IDX
     */
    private Long idx;

    /**
     * 팀 IDX
     */
    private Long teamIdx;

    /**
     * 멤버 IDX (User.idx)
     */
    private Long memberIdx;

    /**
     * 멤버 이름
     */
    private String memberName;

    /**
     * 멤버 부서
     */
    private String memberDept;

    /**
     * 멤버 부서명
     */
    private String memberDeptName;

    /**
     * 멤버 직급
     */
    private String memberPosition;

    /**
     * 멤버 직급명
     */
    private String memberPositionName;

    /**
     * 역할
     */
    private String role;

    /**
     * 가입일
     */
    private LocalDateTime joinDate;

    /**
     * 탈퇴일
     */
    private LocalDateTime leaveDate;

    /**
     * 활성화 여부
     */
    private String isActive;
}
