package com.pinecni.erp.api.user.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

/**
 * 사용자 생성 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreateDTO {

    @NotBlank(message = "사번은 필수입니다")
    @Size(max = 20, message = "사번은 최대 20자입니다")
    private String empId;

    @NotBlank(message = "이름은 필수입니다")
    @Size(max = 50, message = "이름은 최대 50자입니다")
    private String empName;

    @NotNull(message = "생년월일은 필수입니다")
    private LocalDate empBirth;

    @NotBlank(message = "성별은 필수입니다")
    @Size(max = 10, message = "성별은 최대 10자입니다")
    private String empGender;

    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    @Size(max = 100, message = "이메일은 최대 100자입니다")
    private String empEmail;

    @Email(message = "올바른 이메일 형식이 아닙니다")
    @Size(max = 100, message = "외부 이메일은 최대 100자입니다")
    private String externalEmail;

    @NotBlank(message = "전화번호는 필수입니다")
    @Size(max = 20, message = "전화번호는 최대 20자입니다")
    private String empPhone;

    @Size(max = 20, message = "비상연락처는 최대 20자입니다")
    private String emergencyContact;

    @Size(max = 255, message = "주소는 최대 255자입니다")
    private String empAddress;

    @NotBlank(message = "부서는 필수입니다")
    @Size(max = 50, message = "부서는 최대 50자입니다")
    private String empDept;

    @NotBlank(message = "직급은 필수입니다")
    @Size(max = 30, message = "직급은 최대 30자입니다")
    private String empPosition;

    @NotNull(message = "입사일은 필수입니다")
    private LocalDate empJoinDate;

    @Size(max = 20, message = "재직상태는 최대 20자입니다")
    private String empStatus = "재직";

    @Size(max = 20, message = "근무형태는 최대 20자입니다")
    private String empWorkType = "정규직";

    private String empNotes;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다")
    private String password;

    private String memo;

    @Size(max = 10, message = "권한 코드는 최대 10자입니다")
    private String userRoleCode;
}
