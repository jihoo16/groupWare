package com.pinecni.erp.api.competency.dto;

import com.pinecni.erp.entity.UserCareer;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class UserCareerDTO {

    private Long idx;
    private Long userIdx;
    private String careerCategory;
    private Boolean isIndustryExperience;
    private String careerSummary;
    private LocalDate careerStartDate;
    private LocalDate careerEndDate;
    private Integer careerPeriodYears;
    private Integer careerPeriodMonths;
    private Boolean isNow;
    private String notes;

    public static UserCareerDTO from(UserCareer entity) {
        return UserCareerDTO.builder()
                .idx(entity.getIdx())
                .userIdx(entity.getUserIdx())
                .careerCategory(entity.getCareerCategory())
                .isIndustryExperience(entity.getIsIndustryExperience())
                .careerSummary(entity.getCareerSummary())
                .careerStartDate(entity.getCareerStartDate())
                .careerEndDate(entity.getCareerEndDate())
                .careerPeriodYears(entity.getCareerPeriodYears())
                .careerPeriodMonths(entity.getCareerPeriodMonths())
                .isNow(entity.getIsNow())
                .notes(entity.getNotes())
                .build();
    }
}
