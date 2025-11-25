package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 프로젝트 조회 응답 DTO
 * 프론트엔드에 전달할 전체 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDTO {

    /**
     * 프로젝트 IDX
     */
    private Long idx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 고객사명
     */
    private String clientName;

    /**
     * PM User IDX
     */
    private Long projectManagerIdx;

    /**
     * PM 이름 (User 테이블에서 JOIN해서 가져옴)
     */
    private String projectManagerName;

    /**
     * 시작일
     */
    private LocalDate startDate;

    /**
     * 종료일
     */
    private LocalDate endDate;

    /**
     * 프로젝트 상태
     * PLANNING(기획), IN_PROGRESS(진행중), COMPLETED(완료), PENDING(대기), CANCELLED(취소)
     */
    private String projectStatus;

    /**
     * 프로젝트 설명
     */
    private String description;

    /**
     * 증빙 URL
     */
    private String receiptUrl;

    /**
     * 팀원 수 (ProjectMember 개수)
     */
    private Integer memberCount;

    /**
     * 진행률 (0-100)
     * 날짜 기준으로 자동 계산
     */
    private Integer progress;

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
     * 연계 프로젝트 목록
     */
    private List<ProjectRelationDTO> projectRelations;
}
