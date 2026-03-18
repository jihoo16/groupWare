package com.pinecni.erp.api.competency.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class UserTrainingRequestDTO {

    private String trainingName;        // 필수
    private String trainingOrgName;     // 필수
    private LocalDate completionDate;   // 필수
    private String notes;
}
