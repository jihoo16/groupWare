package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 회의록 Service 인터페이스
 */
public interface ReceiptMeetingService {

    /**
     * 전체 회의록 목록 조회
     */
    List<ReceiptMeetingDTO> getAllReceiptMeetings();

    /**
     * 회의록 상세 조회
     */
    ReceiptMeetingDTO getReceiptMeetingById(Long idx);

    /**
     * 프로젝트별 회의록 목록 조회
     */
    List<ReceiptMeetingDTO> getReceiptMeetingsByProjectIdx(Long projectIdx);

    /**
     * 작성자별 회의록 목록 조회
     */
    List<ReceiptMeetingDTO> getReceiptMeetingsByAuthorIdx(Long authorIdx);

    /**
     * 회의록 생성
     */
    ReceiptMeetingDTO createReceiptMeeting(ReceiptMeetingCreateDTO createDTO, Long currentUserIdx);

    /**
     * 회의록 수정
     */
    ReceiptMeetingDTO updateReceiptMeeting(Long idx, ReceiptMeetingUpdateDTO updateDTO, Long currentUserIdx);

    /**
     * 회의록 삭제 (Soft Delete)
     * @param idx 회의록 IDX
     * @param deletedUserIdx 삭제한 사용자 IDX
     */
    void deleteReceiptMeeting(Long idx, Long deletedUserIdx);

    /**
     * 문서번호 생성
     */
    String generateDocumentNumber(Long projectIdx);

    /**
     * 첨부파일 저장
     * @param receiptMeetingIdx 회의록 IDX
     * @param files 업로드할 파일 목록
     * @param uploadUserIdx 업로드 사용자 IDX
     * @return 저장된 첨부파일 정보 목록
     */
    List<ReceiptMeetingAttachmentDTO> saveAttachments(Long receiptMeetingIdx, MultipartFile[] files, Long uploadUserIdx);

    /**
     * 회의록 첨부파일 목록 조회
     * @param receiptMeetingIdx 회의록 IDX
     * @return 첨부파일 목록
     */
    List<ReceiptMeetingAttachmentDTO> getAttachmentsByReceiptMeetingIdx(Long receiptMeetingIdx);
}
