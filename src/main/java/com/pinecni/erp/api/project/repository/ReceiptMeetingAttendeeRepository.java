package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptMeetingAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptMeetingAttendee Repository
 * 연구비증빙 회의록 참석자 조회
 */
@Repository
public interface ReceiptMeetingAttendeeRepository extends JpaRepository<ReceiptMeetingAttendee, Long> {

    /**
     * 회의록별 참석자 목록 조회
     */
    List<ReceiptMeetingAttendee> findByReceiptMeetingIdxOrderByDisplayOrder(Long receiptMeetingIdx);

    /**
     * 회의록의 모든 참석자 삭제
     */
    void deleteByReceiptMeetingIdx(Long receiptMeetingIdx);
}
