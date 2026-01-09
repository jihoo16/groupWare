package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 주간업무보고 수정 요청 DTO
 * 기존 주간업무보고 정보 업데이트 시 사용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyReportUpdateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 보고 기간
     */
    private String reportPeriod;

    /**
     * 금주 주요 업무
     */
    private String mainTasks;

    /**
     * 주요 성과
     */
    private String achievements;

    /**
     * 주요 이슈
     */
    private String issues;

    /**
     * 차주 계획
     */
    private String nextWeekPlan;

    /**
     * 기타 사항
     */
    private String remarks;

    /**
     * 참조자 이름 목록 (쉼표로 구분, 예: "홍길동, 김철수")
     */
    private String referenceNames;

    /**
     * 주차별 달성률 (0-100)
     */
    private Integer weeklyAchievementRate;

    /**
     * 입력 달성률 (0.00 ~ 100.00)
     * 프로젝트 전체 달성률에 추가할 증분값
     */
    private java.math.BigDecimal inputProgressRate;
}
