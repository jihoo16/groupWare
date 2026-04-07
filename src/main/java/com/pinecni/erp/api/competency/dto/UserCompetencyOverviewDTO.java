package com.pinecni.erp.api.competency.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCompetencyOverviewDTO {

    private Long userIdx;
    private String empId;
    private String empName;
    private String empDept;
    private String empDeptName;
    private String empPosition;
    private String empPositionName;
    private String userRoleCode;
    private Long schoolCount;
    private Long certificateCount;
    private Long careerCount;
    private Long trainingCount;
}
