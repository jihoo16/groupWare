package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;

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
     * 상태별 회의록 목록 조회
     */
    List<ReceiptMeetingDTO> getReceiptMeetingsByStatus(String status);

    /**
     * 회의록 생성
     */
    ReceiptMeetingDTO createReceiptMeeting(ReceiptMeetingCreateDTO createDTO);

    /**
     * 회의록 수정
     */
    ReceiptMeetingDTO updateReceiptMeeting(Long idx, ReceiptMeetingUpdateDTO updateDTO);

    /**
     * 회의록 삭제
     */
    void deleteReceiptMeeting(Long idx);

    /**
     * 문서번호 생성
     */
    String generateDocumentNumber(Long projectIdx);

    /**
     * 특정 날짜에 특정 참석자가 포함된 회의록 목록 조회 (중복 검증용)
     * @param date 회의 일자 (yyyy-MM-dd)
     * @param attendeeIdx 참석자 IDX
     * @return 중복된 회의록 목록 (idx, title, createdAt 포함)
     */
    List<Map<String, Object>> findDuplicateAttendee(String date, Long attendeeIdx);
}
