package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptTripCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripUpdateDTO;

import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 출장 Service 인터페이스
 */
public interface ReceiptTripService {

    /**
     * 전체 출장 목록 조회
     */
    List<ReceiptTripDTO> getAllReceiptTrips();

    /**
     * 출장 상세 조회
     */
    ReceiptTripDTO getReceiptTripById(Long idx);

    /**
     * 프로젝트별 출장 목록 조회
     */
    List<ReceiptTripDTO> getReceiptTripsByProjectIdx(Long projectIdx);

    /**
     * 작성자별 출장 목록 조회
     */
    List<ReceiptTripDTO> getReceiptTripsByAuthorIdx(Long authorIdx);

    /**
     * 상태별 출장 목록 조회
     */
    List<ReceiptTripDTO> getReceiptTripsByStatus(String status);

    /**
     * 출장 생성
     */
    ReceiptTripDTO createReceiptTrip(ReceiptTripCreateDTO createDTO);

    /**
     * 출장 수정
     */
    ReceiptTripDTO updateReceiptTrip(Long idx, ReceiptTripUpdateDTO updateDTO);

    /**
     * 출장 삭제
     */
    void deleteReceiptTrip(Long idx);

    /**
     * 문서번호 생성
     */
    String generateDocumentNumber(Long projectIdx);
}
