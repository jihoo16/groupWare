package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptTripMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripMeetingResponseDTO;
import org.springframework.web.multipart.MultipartFile;

/**
 * 연구비증빙 회의+출장 통합 Service
 */
public interface ReceiptTripMeetingService {

    /**
     * 회의+출장 통합 저장 (단일 트랜잭션)
     *
     * @param createDTO      통합 생성 DTO
     * @param receiptFiles   영수증 파일
     * @param documentFiles  공식문서 파일
     * @param currentUserIdx 로그인 사용자 IDX
     * @return 저장 결과 DTO
     */
    ReceiptTripMeetingResponseDTO createReceiptTripMeeting(
            ReceiptTripMeetingCreateDTO createDTO,
            MultipartFile[] receiptFiles,
            MultipartFile[] documentFiles,
            Long currentUserIdx);
}
