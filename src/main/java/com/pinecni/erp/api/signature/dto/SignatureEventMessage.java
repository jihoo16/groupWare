package com.pinecni.erp.api.signature.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * WebSocket으로 PC 화면에 전송되는 서명 이벤트 메시지
 *
 * <p>이벤트 타입:
 * <ul>
 *   <li>SCANNED - 모바일에서 QR 스캔됨</li>
 *   <li>VERIFIED - 사번 2차 인증 성공</li>
 *   <li>VERIFY_FAILED - 사번 입력 실패</li>
 *   <li>COMPLETED - 서명 완료 (signatureImageBase64 포함)</li>
 *   <li>EXPIRED - 세션 만료</li>
 *   <li>CANCELLED - 세션 취소</li>
 * </ul>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignatureEventMessage {

    /** 이벤트 타입 (SCANNED / VERIFIED / VERIFY_FAILED / COMPLETED / EXPIRED / CANCELLED) */
    private String eventType;

    /** 세션 토큰 */
    private String sessionToken;

    /** 문서 IDX */
    private Long documentIdx;

    /** 서명 위치 (C16 코드) */
    private String signatureSlot;

    /** 서명 위치 한글 라벨 (COMPLETED 시 채워짐) — "신청자", "연구책임자", "부서장", "참석자" */
    private String signatureSlotLabel;

    /** 서명자 이름 (COMPLETED 시 채워짐) — 토스트 알림용 */
    private String signerName;

    /** 서명 완료 시: Base64 서명 이미지 data URL */
    private String signatureImageDataUrl;

    /** document_signatures.idx 목록 (연동 서명 포함 — 프론트에서 여러 슬롯에 이미지 주입용) */
    private java.util.List<Long> signedDocumentSignatureIdxList;

    /** 이벤트 발생 시각 */
    private java.time.LocalDateTime timestamp;

    /** 추가 메시지 (에러 등) */
    private String message;
}
