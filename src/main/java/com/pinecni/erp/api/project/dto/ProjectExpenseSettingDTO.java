package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 프로젝트 직급별 경비 설정 DTO (조회용)
 * 새 구조: expenseItemName + amount 방식
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectExpenseSettingDTO {

    /**
     * 직급 코드 (C02001, C02002 등)
     */
    private String positionCode;

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
