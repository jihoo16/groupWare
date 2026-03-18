package com.pinecni.erp.api.competency.dto;

import com.pinecni.erp.entity.UserTraining;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class UserTrainingDTO {

    private Long idx;
    private Long userIdx;
    private String trainingName;
    private String trainingOrgName;
    private LocalDate completionDate;
    private String notes;

    public static UserTrainingDTO from(UserTraining entity) {
        return UserTrainingDTO.builder()
                .idx(entity.getIdx())
                .userIdx(entity.getUserIdx())
                .trainingName(entity.getTrainingName())
                .trainingOrgName(entity.getTrainingOrgName())
                .completionDate(entity.getCompletionDate())
                .notes(entity.getNotes())
                .build();
    }
}
