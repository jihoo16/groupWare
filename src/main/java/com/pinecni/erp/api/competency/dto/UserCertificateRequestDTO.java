package com.pinecni.erp.api.competency.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class UserCertificateRequestDTO {

    private String certificateName;   // 필수
    private String issuingOrgName;    // 필수
    private LocalDate issuedDate;     // 필수
    private Boolean isExpired;
    private String notes;
}
