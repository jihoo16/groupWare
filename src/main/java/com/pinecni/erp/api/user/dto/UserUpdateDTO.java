package com.pinecni.erp.api.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

/**
 * 사용자 수정 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateDTO {

    @Size(max = 50, message = "이름은 최대 50자입니다")
    private String empName;

    private LocalDate empBirth;

    @Size(max = 10, message = "성별은 최대 10자입니다")
    private String empGender;

    @Email(message = "올바른 이메일 형식이 아닙니다")
    @Size(max = 100, message = "이메일은 최대 100자입니다")
    private String empEmail;

    @Email(message = "올바른 이메일 형식이 아닙니다")
    @Size(max = 100, message = "외부 이메일은 최대 100자입니다")
    private String externalEmail;

    @Size(max = 20, message = "전화번호는 최대 20자입니다")
    private String empPhone;

    @Size(max = 20, message = "비상연락처는 최대 20자입니다")
    private String emergencyContact;

    @Size(max = 255, message = "주소는 최대 255자입니다")
    private String empAddress;

    @Size(max = 50, message = "부서는 최대 50자입니다")
    private String empDept;

    @Size(max = 30, message = "직급은 최대 30자입니다")
    private String empPosition;

    private LocalDate empJoinDate;

    @Size(max = 20, message = "재직상태는 최대 20자입니다")
    private String empStatus;

    @Size(max = 20, message = "근무형태는 최대 20자입니다")
    private String empWorkType;

    private String empNotes;

    @Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다")
    private String password;

    private String memo;

    private String profilePhotoPath;
}
