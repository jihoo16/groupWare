package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 프로젝트 연계 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRelationDTO {

    /**
     * 연계 관계 IDX
     */
    private Long idx;

    /**
     * 소스 프로젝트 IDX
     */
    private Long sourceProjectIdx;

    /**
     * 대상 프로젝트 IDX
     */
    private Long targetProjectIdx;

    /**
     * 대상 프로젝트명
     */
    private String targetProjectName;
    /**
     * 대상 프로젝트 상태
     */
    private String targetProjectStatus;
    /**
     * 대상 프로젝트 매니저
     */
    private String targetProjectManager;

    /**
     * 대상 프로젝트 기간 (시작일 ~ 종료일)
     */
    private String targetPeriod;

    /**
     * 연계 유형 (RELATED, DEPENDENT 등)
     */
    private String relationType;

    /**
     * 설명
     */
    private String description;

    /**
     * 생성일시
     */
    private LocalDateTime createdAt;

    /**
     * 생성자 IDX
     */
    private Long createdUserIdx;
}
