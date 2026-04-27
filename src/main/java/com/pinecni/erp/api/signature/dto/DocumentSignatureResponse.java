package com.pinecni.erp.api.signature.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 문서 서명 현황 조회 응답 DTO
 * - 문서 상세 페이지 로딩 시 각 서명칸 상태 표시용
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentSignatureResponse {

    /** document_signatures.idx */
    private Long idx;

    /** 서명 위치 (C16 코드, HTML data-slot과 매칭) */
    private String signatureSlot;

    /** 서명 위치 라벨 */
    private String signatureSlotLabel;

    /** 서명 단계 순번 */
    private Integer signatureOrder;

    /** 서명자 IDX */
    private Long signerUserIdx;

    /** 서명자 사번 */
    private String signerEmpId;

    /** 서명자 이름 */
    private String signerName;

    /** 서명자 직급명 */
    private String signerPositionName;

    /** 서명 상태 (C14 코드) */
    private String status;

    /** 연동 서명 IDX (상위 슬롯 참조) - 있으면 직접 서명 불가 */
    private Long linkedSignatureIdx;

    /** 서명 요청 시각 (NULL이면 아직 차례 아님) */
    private LocalDateTime requestedAt;

    /** 서명 완료 시각 */
    private LocalDateTime signedAt;

    /** 서명 이미지 Base64 data URL (완료된 경우만) */
    private String signatureImageDataUrl;

    /** 현재 사용자가 이 서명칸을 클릭/서명할 수 있는지 여부 */
    private Boolean canSign;

    /** 외부인 서명 여부 (true이면 PC 사용자는 로그인만 되어 있으면 누구나 QR 발급 가능) */
    private Boolean isExternal;

    /** 외부인 소속 (isExternal=true일 때만 채워짐) */
    private String signerCompany;
}
