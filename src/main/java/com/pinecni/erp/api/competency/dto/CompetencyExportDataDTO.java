package com.pinecni.erp.api.competency.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CompetencyExportDataDTO {

    private List<UserCompetencyOverviewDTO> users;
    private List<UserSchoolDTO>      schools;
    private List<UserCertificateDTO> certificates;
    private List<UserCareerDTO>      careers;
    private List<UserTrainingDTO>    trainings;
}
