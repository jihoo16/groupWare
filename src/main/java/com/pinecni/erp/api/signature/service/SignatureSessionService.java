package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.signature.dto.SignatureSessionCreateRequest;
import com.pinecni.erp.api.signature.dto.SignatureSessionResponse;
import com.pinecni.erp.api.signature.dto.SignatureSubmitRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyResponse;

/**
 * 서명 세션 서비스 — QR 기반 전자서명 세션 관리
 */
public interface SignatureSessionService {

    /**
     * QR 서명 세션 생성 (PC에서 서명칸 클릭 시 호출)
     * <ul>
     *   <li>UUID 토큰 생성 + signature_sessions 행 INSERT</li>
     *   <li>ZXing으로 QR 이미지 생성</li>
     *   <li>같은 문서+서명자의 기존 PENDING 세션은 CANCELLED 처리</li>
     * </ul>
     */
    SignatureSessionResponse createSession(SignatureSessionCreateRequest request,
                                            Long loginUserIdx,
                                            String ipAddress);

    /**
     * 토큰으로 세션 정보 조회 (모바일 서명 페이지 진입 시)
     * - 인증 전: 마스킹된 서명자 이름 반환 (홍** 과장)
     * - 인증 후: 전체 이름 반환
     */
    SignatureSessionResponse getSessionByToken(String token);

    /**
     * 모바일 QR 스캔 처리
     * - 세션 상태 C1301 → C1302 전이
     * - PC에 WebSocket "SCANNED" 이벤트 발송
     */
    SignatureSessionResponse scanSession(String token, String ipAddress, String userAgent);

    /**
     * 사번 2차 인증 처리
     * - 입력된 사번 vs 바인딩된 signer_user_idx의 emp_id 비교
     * - 일치: C1302 → C1303 전이
     * - 불일치: verify_fail_count +1, 5회 초과 시 C1305 만료 처리
     */
    SignatureVerifyResponse verifySession(String token,
                                           SignatureVerifyRequest request,
                                           String ipAddress);

    /**
     * 서명 이미지 제출 처리
     * <ul>
     *   <li>세션 검증 (C1303 상태 + 미만료)</li>
     *   <li>Base64 → byte[] 변환 후 document_signatures 저장</li>
     *   <li>연동 서명 자동 처리 (linked_signature_idx가 이 행을 가리키는 하위 행들)</li>
     *   <li>signature_sessions 상태 C1304로 전이</li>
     *   <li>signature_requests 완료 처리</li>
     *   <li>순차 서명 단계 전진 (advanceToNextOrder)</li>
     *   <li>카테고리 B면 자동 PDF 생성 트리거</li>
     *   <li>PC에 WebSocket "COMPLETED" 이벤트 발송 (서명 이미지 포함)</li>
     * </ul>
     */
    void submitSignature(String token,
                         SignatureSubmitRequest request,
                         String ipAddress,
                         String userAgent);

    /**
     * 세션 취소 (PC에서 모달 닫기 등)
     */
    void cancelSession(String token, Long loginUserIdx);

    /**
     * 외부인 서명용 QR 세션 생성 (PC에서 외부 참석자 칸 클릭 시)
     * <ul>
     *   <li>document_signatures에서 is_external=true + signer_user_idx=externalPersonIdx 행 조회</li>
     *   <li>signature_sessions에 is_external=true 세션 생성 (사번 2차 인증 스킵)</li>
     *   <li>모바일 /sign/{token} 에서 사번 입력 단계 건너뛰고 바로 서명 패드 표시</li>
     * </ul>
     *
     * @param documentIdx 문서 IDX
     * @param externalPersonIdx external_person.idx (참석자)
     * @param loginUserIdx 세션 생성자 (PC 사용자, 문서 담당자 등)
     * @param ipAddress 세션 생성자 IP (감사용)
     */
    SignatureSessionResponse createExternalSession(Long documentIdx,
                                                    Long externalPersonIdx,
                                                    Long loginUserIdx,
                                                    String ipAddress);
}
