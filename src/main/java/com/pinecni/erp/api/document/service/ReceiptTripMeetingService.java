package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptTripMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingResponseDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 연구비증빙 출장+회의 통합 Service
 */
public interface ReceiptTripMeetingService {

    /** 출장+회의 통합 저장 */
    ReceiptTripMeetingResponseDTO createReceiptTripMeeting(
            ReceiptTripMeetingCreateDTO createDTO,
            MultipartFile[] meetingReceiptFiles,
            MultipartFile[] meetingDocumentFiles,
            MultipartFile[] tripReceiptFiles,
            MultipartFile[] tripDocumentFiles,
            Long currentUserIdx);

    /** 상세 조회 */
    ReceiptTripMeetingResponseDTO getReceiptTripMeetingById(Long idx);

    /** 프로젝트별 목록 */
    List<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingsByProjectIdx(Long projectIdx);

    /** 작성자별 목록 */
    List<ReceiptTripMeetingResponseDTO> getReceiptTripMeetingsByDrafterUserIdx(Long drafterUserIdx);

    /** 수정 */
    ReceiptTripMeetingResponseDTO updateReceiptTripMeeting(
            Long idx,
            ReceiptTripMeetingCreateDTO updateDTO,
            MultipartFile[] meetingReceiptFiles,
            MultipartFile[] meetingDocumentFiles,
            MultipartFile[] tripReceiptFiles,
            MultipartFile[] tripDocumentFiles,
            Long currentUserIdx);

    /** 소프트 딜리트 */
    void deleteReceiptTripMeeting(Long idx, Long deletedUserIdx);

    // ── 첨부파일 ────────────────────────────────────────────────────

    /** 기존 문서에 첨부파일 추가 (목록 화면 모달용) */
    void addAttachments(
            Long idx,
            MultipartFile[] meetingReceiptFiles,
            MultipartFile[] meetingDocumentFiles,
            MultipartFile[] tripReceiptFiles,
            MultipartFile[] tripDocumentFiles,
            Long currentUserIdx);

    /** 첨부파일 목록 조회 */
    List<ReceiptTripMeetingAttachmentDTO> getAttachmentsByReceiptTripMeetingIdx(Long receiptTripMeetingIdx);

    /** 첨부파일 단건 조회 (다운로드용) */
    ReceiptTripMeetingAttachmentDTO getAttachmentById(Long attachmentIdx);

    /** 첨부파일 소프트 딜리트 */
    void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx);
}
