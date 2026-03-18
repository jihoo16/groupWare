package com.pinecni.erp.api.competency.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class UserCareerRequestDTO {

    private String careerCategory;      // 필수
    private Boolean isIndustryExperience;
    private String careerSummary;
    private LocalDate careerStartDate;  // 필수
    private LocalDate careerEndDate;    // is_now = true 이면 null 허용
    private Boolean isNow;
    private String notes;

    // careerPeriodYears / careerPeriodMonths 는 서비스에서 자동 계산
}
