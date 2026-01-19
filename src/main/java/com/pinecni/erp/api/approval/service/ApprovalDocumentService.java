package com.pinecni.erp.api.approval.service;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;

import java.util.List;

/**
 * 전자 문서 Service Interface
 */
public interface ApprovalDocumentService {

    /**
     * 전체 문서 목록 조회 (최신순)
     * - 연차신청서는 본인이 작성한 것만 조회
     * @param currentUserIdx 현재 로그인한 사용자 IDX
     * @return 문서 목록
     */
    List<ApprovalDocumentDTO> getAllDocuments(Long currentUserIdx);

    /**
     * 문서 타입별 목록 조회
     * @param documentType 문서 타입
     * @return 필터링된 문서 목록
     */
    List<ApprovalDocumentDTO> getDocumentsByType(String documentType);

    /**
     * 작성자별 문서 목록 조회
     * @param drafterUserIdx 작성자 사용자 IDX
     * @return 작성자의 문서 목록
     */
    List<ApprovalDocumentDTO> getDocumentsByDrafter(Long drafterUserIdx);
}
