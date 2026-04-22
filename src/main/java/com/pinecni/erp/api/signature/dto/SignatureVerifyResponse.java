package com.pinecni.erp.api.signature.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사번 2차 인증 응답 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatureVerifyResponse {

    /** 인증 성공 여부 */
    private Boolean success;

    /** 인증 완료 후 세션 상태 (성공 시 C1303, 실패 시 C1302 또는 C1305) */
    private String status;

    /** 실패 횟수 (모바일 UI에 "N/5" 표시용) */
    private Integer failCount;

    /** 최대 실패 허용 횟수 */
    private Integer maxFailCount;

    /** 세션 만료 여부 (실패 5회 초과 시 true) */
    private Boolean sessionExpired;

    /** 인증 성공 시: 서명자 전체 이름 (이제 공개 가능) */
    private String signerNameFull;

    /** 인증 실패 시 안내 메시지 */
    private String message;
}
