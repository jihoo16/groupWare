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
    private String empDept;
    private String empPosition;
    private LocalDate empJoinDate;
    private String empStatus;
    private String empWorkType;
    private String empNotes;
    private String profilePhotoPath;
    private String memo;
    private LocalDateTime lastLoginDate;
    private LocalDateTime createdAt;
    private Long createdUserIdx;
    private LocalDateTime updatedAt;
    private Long updatedUserIdx;
}
