package com.pinecni.erp.api.signature.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사번 2차 인증 요청 DTO (모바일 서명 페이지)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatureVerifyRequest {

    /** 사용자가 입력한 사번 */
    @NotBlank(message = "사번을 입력해주세요")
    private String empId;

    /** QR URL에 포함된 HMAC 해시 (vh 파라미터) */
    private String verifyHash;
}
