package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeetingAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 연구비증빙 회의+출장 참석자 Repository
 */
@Repository
public interface ReceiptTripMeetingAttendeeRepository extends JpaRepository<ReceiptTripMeetingAttendee, Long> {

    /**
     * 회의+출장 IDX로 참석자 전체 조회 (삭제되지 않은 건, 순서 오름차순)
     */
    List<ReceiptTripMeetingAttendee> findByReceiptTripMeetingIdxAndIsDeletedFalseOrderByDisplayOrderAsc(Long receiptTripMeetingIdx);

    /**
     * 회의+출장 IDX + 참여 구분으로 참석자 조회 (삭제되지 않은 건)
     */
    List<ReceiptTripMeetingAttendee> findByReceiptTripMeetingIdxAndParticipationTypeAndIsDeletedFalse(
            Long receiptTripMeetingIdx, String participationType);
}
