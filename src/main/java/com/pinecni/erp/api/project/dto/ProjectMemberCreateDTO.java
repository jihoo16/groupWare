package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 프로젝트 참여인력 생성 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberCreateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long project_idx;

    /**
     * 참여인력 User IDX (employeeIdx)
     */
    private Long employeeIdx;

    /**
     * 참여 시작일
     */
    private LocalDate participationStartDate;

    /**
     * 참여 종료일
     */
    private LocalDate participationEndDate;

    /**
     * 역할 (선택)
     */
    private String role;
}
