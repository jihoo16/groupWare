package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

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
}
