package com.pinecni.erp.api.competency.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class UserSchoolRequestDTO {

    private String schoolName;      // 필수
    private String majorName;
    private String degreeType;      // HIGH_SCHOOL / ASSOCIATE / BACHELOR / MASTER / DOCTOR
    private LocalDate graduationDate;
    private String notes;
    private Boolean isStemMajor;    // 이공계 학위 여부 (null 시 false 처리)
}
