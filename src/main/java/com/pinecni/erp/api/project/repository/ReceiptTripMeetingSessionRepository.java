package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeetingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptTripMeetingSessionRepository extends JpaRepository<ReceiptTripMeetingSession, Long> {

    List<ReceiptTripMeetingSession> findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(Long receiptTripMeetingIdx);

    void deleteByReceiptTripMeetingIdx(Long receiptTripMeetingIdx);
}
