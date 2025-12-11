package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 월간업무보고 조회 응답 DTO
 * 프론트엔드에 전달할 전체 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyReportDTO {

    /**
     * 월간업무보고 ID
     */
    private Long id;

    /**
     * 보고자 IDX
     */
    private Long userIdx;

    /**
     * 보고자 이름
     */
    private String userName;

    /**
     * 보고자 부서
     */
    private String userDept;

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

    /**
     * 생성일시
     */
    private Instant createdAt;

    /**
     * 수정일시
     */
    private Instant updatedAt;

    /**
     * 생성자 IDX
     */
    private Long createdUserIdx;

    /**
     * 수정자 IDX
     */
    private Long updatedUserIdx;
}
