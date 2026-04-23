package com.pinecni.erp.api.signature.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 서명 세션 정보 응답 DTO
 * - QR 생성 시 PC로 반환
 * - 모바일 서명 페이지 진입 시 토큰으로 조회 (마스킹된 정보)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatureSessionResponse {

    /** 세션 토큰 */
    private String sessionToken;

    /** QR 이미지 (Base64 data URL, "data:image/png;base64,...") — 세션 생성 시에만 포함 */
    private String qrDataUrl;

    /** 세션 만료 시각 (PC 카운트다운용) */
    private LocalDateTime expiresAt;

    /** 세션 상태 (C13 코드) */
    private String status;

    /** 문서 IDX */
    private Long documentIdx;

    /** 문서번호 (표시용) */
    private String documentNo;

    /** 문서 제목 */
    private String documentTitle;

    /** 문서 유형 코드 (C04) */
    private String documentType;

    /** 문서 유형명 */
    private String documentTypeName;

    /** 서명 위치 코드 (C16) */
    private String signatureSlot;

    /** 서명 위치 라벨 (참석자/신청자/연구책임자/부서장) */
    private String signatureSlotLabel;

    /** 서명자 이름 — 모바일 2차 인증 전에는 마스킹 (홍** 과장) */
    private String signerNameMasked;

    /** 서명자 이름 — 2차 인증 완료 후 전체 공개 */
    private String signerNameFull;

    /** 사번 입력 실패 횟수 (모바일 UI 표시용) */
    private Integer verifyFailCount;

    /** 사번 2차 인증 완료 여부 */
    private Boolean verified;

    /** 외부인 서명 세션 여부 (true면 모바일은 사번 입력 단계 스킵) */
    private Boolean isExternal;

    /** 외부인 소속 (isExternal=true일 때만 채워짐 — 모바일에서 확인용) */
    private String signerCompany;
}
