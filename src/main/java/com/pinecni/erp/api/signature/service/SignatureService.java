package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.signature.dto.DocumentSignatureResponse;

import java.util.List;
import java.util.Map;

/**
 * 서명 관리 서비스 — 순차 서명·연동 서명·제출 게이트
 *
 * <p>주요 기능:
 * <ul>
 *   <li>문서 생성 시 결재라인 기반 서명 요청 자동 생성</li>
 *   <li>순차 서명 단계 전진 로직</li>
 *   <li>문서 제출 게이트 (isAllSignaturesComplete)</li>
 *   <li>문서 편집 잠금 검증 (hasAnySignatureCaptured)</li>
 *   <li>문서 상세 페이지 서명 현황 조회</li>
 * </ul>
 */
public interface SignatureService {

    /**
     * 문서 생성 시 결재라인 템플릿 기반 서명 요청 자동 생성
     * <ol>
     *   <li>approval_line_templates에서 해당 문서유형의 결재선 조회</li>
     *   <li>signer_role에 따라 실제 서명자 결정 (ATTENDEE/DRAFTER/PROJECT_LEAD/DEPT_HEAD)</li>
     *   <li>document_signatures 행 생성 (slot, order, signer별)</li>
     *   <li>is_auto_linked=TRUE + 같은 사람 복수 슬롯 → linked_signature_idx 설정</li>
     *   <li>order=1 중 linked 없는 행의 requested_at 설정 + signature_requests 생성</li>
     * </ol>
     *
     * <p>각 문서 생성 서비스(VacationServiceImpl, ReceiptMeetingServiceImpl 등)에서 호출.
     *
     * @param documentIdx 문서 IDX (approval_documents.idx)
     * @param requesterUserIdx 서명 요청자 (로그인 사용자, 문서 생성자)
     */
    void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx);

    /**
     * 프로젝트 문서용 오버로드
     * @param projectIdx 프로젝트 IDX (PROJECT_LEAD 결정용, null이면 스킵)
     * @param attendeeUserIdxList 내부 참석자 userIdx 목록 (ATTENDEE 서명용, null이면 스킵)
     */
    void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx,
                                       Long projectIdx, List<Long> attendeeUserIdxList);

    /**
     * 프로젝트 문서용 오버로드 (외부 참석자 포함)
     * @param projectIdx 프로젝트 IDX
     * @param attendeeUserIdxList 내부 참석자 users.idx 목록
     * @param externalAttendeeIdxList 외부 참석자 external_person.idx 목록
     *                                (각 외부인에 대해 is_external=true DS row 생성)
     */
    void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx,
                                       Long projectIdx,
                                       List<Long> attendeeUserIdxList,
                                       List<Long> externalAttendeeIdxList);

    /**
     * 순차 서명 단계 전진
     * <ul>
     *   <li>현재 단계(currentOrder)의 모든 행(linked 제외) 완료 여부 확인</li>
     *   <li>전원 완료 시 → 다음 단계(currentOrder+1) 행의 requested_at 설정 + 알림 발송</li>
     *   <li>다음 단계가 없으면 → 전체 완료 상태 (카테고리 B는 자동 PDF 생성 트리거)</li>
     * </ul>
     *
     * <p>idempotent: 여러 번 호출해도 안전하도록 `UPDATE WHERE requested_at IS NULL`로 처리.
     */
    void advanceToNextOrder(Long documentIdx, Integer currentOrder);

    /**
     * 제출 게이트 — 전자서명 전원 완료 여부
     * <ul>
     *   <li>document_signatures의 linked 없는 행이 모두 C1402/C1403인지 확인</li>
     *   <li>기존 제출 API(연차/경비)에서 이 메서드로 검증 후 제출 허용</li>
     * </ul>
     */
    boolean isAllSignaturesComplete(Long documentIdx);

    /**
     * 문서 편집 잠금 판단 (수정/삭제 차단용)
     * <ul>
     *   <li>document_signatures에 C1402 행이 1개라도 있으면 true</li>
     *   <li>모든 문서 유형의 편집/삭제 API에서 이 메서드로 검증</li>
     * </ul>
     */
    boolean hasAnySignatureCaptured(Long documentIdx);

    /**
     * 문서의 서명 현황 조회 (상세 페이지 렌더링용)
     *
     * @param documentIdx 문서 IDX
     * @param loginUserIdx 현재 로그인 사용자 (canSign 판단용)
     * @return 순번 오름차순 서명 현황 목록
     */
    List<DocumentSignatureResponse> getDocumentSignatures(Long documentIdx, Long loginUserIdx);

    /**
     * 사용자의 서명 대기 건수 (홈 위젯 배지용)
     */
    long countPendingForUser(Long userIdx);

    /**
     * 사용자의 서명 대기 목록
     */
    List<Map<String, Object>> getPendingListForUser(Long userIdx);

    /**
     * 사용자의 서명 완료 이력
     */
    List<Map<String, Object>> getCompletedListForUser(Long userIdx);

    /**
     * 일괄 서명 적용 — 동일 서명 이미지를 여러 문서에 적용
     * @return 적용된 건수
     */
    int bulkApplySignature(Long userIdx, List<Long> documentSignatureIdxList, String signatureImageBase64);

    /**
     * 내가 요청한 서명 목록 (내가 만든 문서의 서명 진행 현황)
     */
    List<Map<String, Object>> getRequestedListForUser(Long userIdx);

    /**
     * 문서의 가장 최근 서명 완료 시각.
     * <p>받은 PDF 영역이 페이지 로드 시 "방금 서명 끝난 문서인지" 판별해
     * "생성 중" 상태로 자동 진입할지 결정하는 데 사용.</p>
     */
    java.util.Optional<java.time.LocalDateTime> getLastSignedAt(Long documentIdx);
}
