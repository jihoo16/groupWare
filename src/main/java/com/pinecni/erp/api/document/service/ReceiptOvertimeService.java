package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 연구비증빙 야근식대 Service Interface
 */
public interface ReceiptOvertimeService {

    /**
     * 전체 야근식대 목록 조회
     */
    List<ReceiptOvertimeDTO> getAllReceiptOvertimes();

    /**
     * 야근식대 상세 조회
     */
    ReceiptOvertimeDTO getReceiptOvertimeById(Long idx);

    /**
     * ApprovalDocument IDX로 야근식대 조회
     */
    ReceiptOvertimeDTO getReceiptOvertimeByDocumentIdx(Long documentIdx);

    /**
     * 프로젝트별 야근식대 목록 조회
     */
    List<ReceiptOvertimeDTO> getReceiptOvertimesByProjectIdx(Long projectIdx);

    /**
     * 작성자별 야근식대 목록 조회
     */
    List<ReceiptOvertimeDTO> getReceiptOvertimesByAuthorIdx(Long authorIdx);

    /**
     * 상태별 야근식대 목록 조회
     */
    List<ReceiptOvertimeDTO> getReceiptOvertimesByStatus(String status);

    /**
     * 야근식대 생성
     */
    ReceiptOvertimeDTO createReceiptOvertime(ReceiptOvertimeCreateDTO createDTO, Long currentUserIdx);

    /**
     * 야근식대 수정
     */
    ReceiptOvertimeDTO updateReceiptOvertime(Long idx, ReceiptOvertimeCreateDTO updateDTO, Long currentUserIdx);

    /**
     * 야근식대 삭제 (소프트 딜리트)
     */
    void deleteReceiptOvertime(Long idx);

    /**
     * 야근식대 삭제 (소프트 딜리트) - 현재 사용자 IDX 포함
     */
    void deleteReceiptOvertime(Long idx, Long currentUserIdx);

    /**
     * 문서번호 생성
     */
    String generateDocumentNumber(Long projectIdx);

    /**
     * 첨부파일 저장
     */
    List<ReceiptOvertimeAttachmentDTO> saveAttachments(Long receiptOvertimeIdx, MultipartFile[] files);

    /**
     * 야근식대별 첨부파일 목록 조회
     */
    List<ReceiptOvertimeAttachmentDTO> getAttachmentsByReceiptOvertimeIdx(Long receiptOvertimeIdx);

    /**
     * 첨부파일 삭제
     */
    void deleteAttachment(Long attachmentIdx);

    /**
     * 첨부파일 상세 조회
     */
    ReceiptOvertimeAttachmentDTO getAttachmentById(Long attachmentIdx);
}
