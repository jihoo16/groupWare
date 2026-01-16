package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 프로젝트 수정 요청 DTO
 * 기존 프로젝트 정보 업데이트 시 사용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectUpdateDTO {

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
     * 현재 차수 시작일
     */
    private LocalDate startDate;

    /**
     * 현재 차수 종료일
     */
    private LocalDate endDate;

    /**
     * 전체 프로젝트 시작일 (1차년도 시작일)
     */
    private LocalDate totalPeriodStart;

    /**
     * 전체 프로젝트 종료일 (최종 차수 종료일)
     */
    private LocalDate totalPeriodEnd;

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
     * 활동비 예산
     */
    private BigDecimal activityBudget;

    /**
     * 장비비 예산
     */
    private BigDecimal equipmentBudget;

    /**
     * 재료비 예산
     */
    private BigDecimal materialBudget;

    /**
     * 프로젝트 달성률 (0.00 ~ 100.00)
     */
    private BigDecimal progressRate;

    /**
     * 연구비 카드 목록
     */
    private List<ProjectCardCreateDTO> projectCards;

    /**
     * 연계 프로젝트 목록
     */
    private List<ProjectRelationsCreateDTO> projectRelations;

    /**
     * 팀원 목록
     */
    private List<ProjectMemberCreateDTO> projectMembers;
    
    /**
     * 직급별 경비 목록
     */
    private List<ProjectExpenseSettingDTO> projectExpenseSettings;
}
