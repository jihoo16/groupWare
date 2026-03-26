package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptTripAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripUpdateDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 연구비증빙 출장 Service 인터페이스
 */
public interface ReceiptTripService {

    // ── 출장 기본 CRUD ──────────────────────────────────────────

    List<ReceiptTripDTO> getAllReceiptTrips();

    ReceiptTripDTO getReceiptTripById(Long idx);

    List<ReceiptTripDTO> getReceiptTripsByProjectIdx(Long projectIdx);

    List<ReceiptTripDTO> getReceiptTripsByAuthorIdx(Long authorIdx);

    List<ReceiptTripDTO> getReceiptTripsByStatus(String status);

    ReceiptTripDTO createReceiptTrip(ReceiptTripCreateDTO createDTO, Long currentUserIdx);

    ReceiptTripDTO updateReceiptTrip(Long idx, ReceiptTripUpdateDTO updateDTO, Long currentUserIdx);

    /** 소프트 딜리트 */
    void deleteReceiptTrip(Long idx, Long deletedUserIdx);

    // ── 첨부파일 ────────────────────────────────────────────────

    /**
     * 첨부파일 저장 (RECEIPT / DOCUMENT 타입 구분)
     */
    List<ReceiptTripAttachmentDTO> saveAttachments(Long receiptTripIdx,
                                                    MultipartFile[] files,
                                                    String attachmentType,
                                                    Long uploadUserIdx);

    /**
     * 출장별 첨부파일 목록 조회 (삭제되지 않은 건)
     */
    List<ReceiptTripAttachmentDTO> getAttachmentsByReceiptTripIdx(Long receiptTripIdx);

    /**
     * 첨부파일 단건 조회
     */
    ReceiptTripAttachmentDTO getAttachmentById(Long attachmentIdx);

    /**
     * 첨부파일 소프트 딜리트
     */
    void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx);
}
