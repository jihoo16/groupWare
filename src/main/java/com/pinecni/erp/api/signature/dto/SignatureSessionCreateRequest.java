package com.pinecni.erp.api.signature.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 서명 세션 생성 요청 DTO
 * - PC 화면에서 서명칸 클릭 시 QR 코드 발급 요청
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatureSessionCreateRequest {

    /** 대상 문서 IDX */
    @NotNull(message = "문서 IDX는 필수입니다")
    private Long documentIdx;

    /** 서명 위치 (C16 코드) - 클릭한 셀의 data-slot */
    @NotNull(message = "서명 위치는 필수입니다")
    private String signatureSlot;
}
