package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 월간업무보고 수정 요청 DTO
 * 기존 월간업무보고 정보 업데이트 시 사용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyReportUpdateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 보고 월 (YYYY-MM 형식)
     */
    private String reportMonth;

    /**
     * 월간 주요 업무
     */
    private String mainTasks;

    /**
     * 목표 대비 실적
     */
    private String performance;

    /**
     * 개선 사항
     */
    private String improvements;

    /**
     * 차월 계획
     */
    private String nextMonthPlan;
}
