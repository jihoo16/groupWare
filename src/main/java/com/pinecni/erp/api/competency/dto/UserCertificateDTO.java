package com.pinecni.erp.api.competency.dto;

import com.pinecni.erp.entity.UserCertificate;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
public class UserCertificateDTO {

    private Long idx;
    private Long userIdx;
    private String certificateName;
    private String issuingOrgName;
    private LocalDate issuedDate;
    private Boolean isExpired;
    private String notes;
    private List<AttachmentSummaryDTO> attachments;

    public static UserCertificateDTO from(UserCertificate entity) {
        return UserCertificateDTO.builder()
                .idx(entity.getIdx())
                .userIdx(entity.getUserIdx())
                .certificateName(entity.getCertificateName())
                .issuingOrgName(entity.getIssuingOrgName())
                .issuedDate(entity.getIssuedDate())
                .isExpired(entity.getIsExpired())
                .notes(entity.getNotes())
                .build();
    }
}
