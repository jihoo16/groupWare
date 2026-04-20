package com.pinecni.erp.api.signature.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 모바일에서 전송되는 서명 제출 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatureSubmitRequest {

    /**
     * Base64 인코딩된 PNG 서명 이미지
     * 예: "data:image/png;base64,iVBORw0KGgoAAAA..."
     * (서버에서 "data:image/png;base64," prefix 자동 제거 후 디코딩)
     */
    @NotBlank(message = "서명 이미지는 필수입니다")
    private String signatureImageBase64;
}
