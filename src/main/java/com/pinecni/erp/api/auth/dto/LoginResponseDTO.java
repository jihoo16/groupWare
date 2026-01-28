package com.pinecni.erp.api.auth.dto;

import lombok.*;

/**
 * 로그인 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDTO {

    private Long idx;
    private String empId;
    private String empName;
    private String empDept;
    private String empDeptName;
    private String empPosition;
    private String empPositionName;
    private String empEmail;
    private Boolean isAdmin;
    private Boolean isFirstLogin; // 최초 로그인 여부 (last_login_date가 null인 경우)
    private String message;
}
