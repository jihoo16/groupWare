package com.pinecni.erp.api.competency.dto;

import com.pinecni.erp.entity.UserSchool;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
public class UserSchoolDTO {

    private Long idx;
    private Long userIdx;
    private String schoolName;
    private String majorName;
    private String degreeType;
    private LocalDate graduationDate;
    private String notes;
    private Boolean isStemMajor;
    private List<AttachmentSummaryDTO> attachments;

    public static UserSchoolDTO from(UserSchool entity) {
        return UserSchoolDTO.builder()
                .idx(entity.getIdx())
                .userIdx(entity.getUserIdx())
                .schoolName(entity.getSchoolName())
                .majorName(entity.getMajorName())
                .degreeType(entity.getDegreeType())
                .graduationDate(entity.getGraduationDate())
                .notes(entity.getNotes())
                .isStemMajor(entity.getIsStemMajor())
                .build();
    }
}
