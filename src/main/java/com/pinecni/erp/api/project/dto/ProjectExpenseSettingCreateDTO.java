package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 프로젝트 직급별 경비 설정 생성 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectExpenseSettingCreateDTO {

    /**
     * 직급 코드 (C02001, C02002 등)
     */
    private String positionCode;

    /**
     * 직급명 (사원, 대리, 과장 등)
     */
    private String positionName;

    /**
     * 교통비 처리 방식 (기본값: "실비")
     */
    private String transitAllowance;

    /**
     * 일비
     */
    private Integer dailyAllowance;

    /**
     * 식비
     */
    private Integer mealAllowance;

    /**
     * 회의비
     */
    private Integer meetingAllowance;

    /**
     * 야근식대
     */
    private Integer overtimeMealAllowance;
}
