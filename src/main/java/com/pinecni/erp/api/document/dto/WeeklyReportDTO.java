package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 주간업무보고 조회 응답 DTO
 * 프론트엔드에 전달할 전체 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyReportDTO {

    /**
     * 주간업무보고 ID
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
     * 보고자 부서 코드
     */
    private String userDept;

    /**
     * 보고자 부서 이름
     */
    private String userDeptName;

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 전자결재 문서 IDX (approval_documents 테이블 참조)
     */
    private Long documentIdx;

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
}
