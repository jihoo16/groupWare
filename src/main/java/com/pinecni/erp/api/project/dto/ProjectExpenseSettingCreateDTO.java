package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 프로젝트 직급별 경비 설정 생성 DTO
 * 새 구조: expenseItemName + amount 방식
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
     * 경비 항목명 (중식비, 야근석식대, 회의비, 출장비 등)
     */
    private String expenseItemName;

    /**
     * 경비 항목명 (영문)
     */
    private String expenseItemNameEn;

    /**
     * 금액
     */
    private Integer amount;
}
