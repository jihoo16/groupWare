package com.pinecni.erp.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * 로그인 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequestDTO {

    @NotBlank(message = "사번은 필수입니다")
    private String empId;

    @NotBlank(message = "비밀번호는 필수입니다")
    private String password;

    private Boolean rememberMe = false;
}
