package com.pinecni.erp.api.document.dto;

import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 월간업무보고 생성 요청 DTO
 * 신규 월간업무보고 등록 시 필요한 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyReportCreateDTO {

    /**
     * 보고자 IDX (필수)
     */
    private Long userIdx;

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 보고 월
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
