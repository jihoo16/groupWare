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

    /** 퇴사예정일. null 로 보내면 변경하지 않음. 명시적으로 해제하려면 별도 플래그 필요(현재는 변경+해제 분기 없이 set 만 지원). */
    private LocalDate plannedResignationDate;

    /**
     * 퇴사예정일 명시적 해제 플래그. true 면 plannedResignationDate 가 null 로 클리어된다.
     * (LocalDate null 만으로는 "변경 없음" 과 "해제" 를 구분할 수 없어서 별도 플래그 사용)
     */
    private Boolean plannedResignationDateClear;

    @Size(max = 20, message = "근무형태는 최대 20자입니다")
    private String empWorkType;

    private String empNotes;

    @Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다")
    private String password;

    private String memo;

    private String profilePhotoPath;

    @Size(max = 10, message = "권한 코드는 최대 10자입니다")
    private String userRoleCode;
}
