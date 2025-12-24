package com.pinecni.erp.api.project.dto;

import com.pinecni.erp.entity.ProjectMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 프로젝트 생성 요청 DTO
 * 신규 프로젝트 등록 시 필요한 최소 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCreateDTO {

    /**
     * 프로젝트명 (필수)
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
     * 시작일 (필수)
     */
    private LocalDate startDate;

    /**
     * 종료일 (필수)
     */
    private LocalDate endDate;

    /**
     * 프로젝트 상태
     * 기본값: PLANNING (Service에서 처리)
     */
    private String projectStatus;

    /**
     * 프로젝트 설명
     */
    private String description;

    /**
     * 활동비 예산
     */
    private BigDecimal activityBudget;

    /**
     * 장비비 예산
     */
    private BigDecimal equipmentBudget;

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
     * 직급별 경비 설정 목록
     */
    private List<ProjectExpenseSettingCreateDTO> expenseSettings;
}
