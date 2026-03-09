package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
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
     * 활동비 사용액 (집행된 금액)
     */
    private BigDecimal activityUsed;

    /**
     * 활동비 세부 내역 - 회의록
     */
    private BigDecimal meetingUsed;

    /**
     * 활동비 세부 내역 - 단독 출장
     */
    private BigDecimal tripUsed;

    /**
     * 활동비 세부 내역 - 출장+회의
     */
    private BigDecimal tripMeetingUsed;

    /**
     * 활동비 세부 내역 - 야근식대
     */
    private BigDecimal overtimeUsed;

    /**
     * 장비비 사용액 (집행된 금액)
     */
    private BigDecimal equipmentUsed;

    /**
     * 재료비 사용액 (집행된 금액)
     */
    private BigDecimal materialUsed;

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
     * 프로젝트 달성률 (0.00 ~ 100.00)
     * DB에 저장된 실제 달성률
     */
    private BigDecimal progressRate;

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
    /**
     * 프로젝트 멤버 목록
     */
    private List<ProjectMemberDTO> projectMembers ;

    /**
     * 직급별 경비 목록
     */
    private List<ProjectExpenseSettingDTO> projectExpenseSettings  ;

}
