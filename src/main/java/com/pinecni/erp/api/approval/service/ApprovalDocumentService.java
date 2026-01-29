package com.pinecni.erp.api.approval.service;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;

import java.util.List;

/**
 * 전자 문서 Service Interface
 */
public interface ApprovalDocumentService {

    /**
     * 일반 전자결재 문서 목록 조회 (최신순, is_project = false)
     * - 연차신청서는 본인이 작성한 것만 조회
     * @param currentUserIdx 현재 로그인한 사용자 IDX
     * @return 일반 문서 목록
     */
    List<ApprovalDocumentDTO> getAllDocuments(Long currentUserIdx);

    /**
     * 프로젝트 문서 전체 조회 (최신순, is_project = true)
     * - 프로젝트 주간보고, 연구비증빙 등
     * @return 프로젝트 문서 목록
     */
    List<ApprovalDocumentDTO> getAllProjectDocuments();

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

    /**
     * 프로젝트별 문서 목록 조회
     * @param projectIdx 프로젝트 IDX
     * @return 프로젝트의 문서 목록
     */
    List<ApprovalDocumentDTO> getDocumentsByProject(Long projectIdx);

    /**
     * 프로젝트별 + 타입별 문서 목록 조회
     * @param projectIdx 프로젝트 IDX
     * @param documentType 문서 타입
     * @return 필터링된 문서 목록
     */
    List<ApprovalDocumentDTO> getDocumentsByProjectAndType(Long projectIdx, String documentType);

    /**
     * 프로젝트별 + 복수 타입별 문서 목록 조회
     * @param projectIdx 프로젝트 IDX
     * @param documentTypes 문서 타입 배열
     * @return 필터링된 문서 목록
     */
    List<ApprovalDocumentDTO> getDocumentsByProjectAndTypes(Long projectIdx, String[] documentTypes);
}
