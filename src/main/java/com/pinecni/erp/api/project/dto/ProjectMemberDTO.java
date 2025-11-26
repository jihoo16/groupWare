package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 프로젝트 멤버 응답 DTO
 * 프론트엔드에 전달할 팀원 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberDTO {

    /**
     * 프로젝트 멤버 IDX
     */
    private Long idx;

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 직원 IDX
     */
    private Long employeeIdx;

    /**
     * 프로젝트 내 역할
     */
    private String role;

    /**
     * 시작일
     */
    private LocalDate participationStartDate;

    /**
     * 종료일
     */
    private LocalDate participationEndDate;

    /**
     * 생성일시
     */
    private LocalDateTime createdAt;

    /**
     * 수정일시
     */
    private LocalDateTime updatedAt;

    /**
     * 생성자 IDX
     */
    private Long createdUserIdx;

    /**
     * 수정자 IDX
     */
    private Long updatedUserIdx;

    /**
     * 직원 이름 (User 테이블에서 JOIN해서 가져옴)
     */
    private String employeeName;

    /**
     * 직원 부서명 (User 테이블에서 JOIN해서 가져옴)
     */
    private String employeeDeptName;

    /**
     * 직원 직급명 (User 테이블에서 JOIN해서 가져옴)
     */
    private String employeePositionName;

}
