package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

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
}
