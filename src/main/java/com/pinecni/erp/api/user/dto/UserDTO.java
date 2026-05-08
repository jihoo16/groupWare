package com.pinecni.erp.api.user.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 사용자 정보 DTO (조회용)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {

    private Long idx;
    private String empId;
    private String empName;
    private LocalDate empBirth;
    private String empGender;
    private String empEmail;
    private String externalEmail;
    private String empPhone;
    private String emergencyContact;
    private String empAddress;
    private String empDept; // 부서 코드 (C01001, C01002 등)
    private String empDeptName; // 부서 코드명 (경영지원본부, 개발본부 등)
    private String empPosition; // 직급 코드 (C02001, C02002 등)
    private String empPositionName; // 직급 코드명 (전무, 상무, 부장 등)
    private LocalDate empJoinDate;
    private String empStatus;
    private LocalDate plannedResignationDate;
    private String empWorkType;
    private String empNotes;
    private String profilePhotoPath;
    private String memo;
    private LocalDateTime lastLoginDate;
    private String userRoleCode;
    private LocalDateTime createdAt;
    private Long createdUserIdx;
    private LocalDateTime updatedAt;
    private Long updatedUserIdx;
}
