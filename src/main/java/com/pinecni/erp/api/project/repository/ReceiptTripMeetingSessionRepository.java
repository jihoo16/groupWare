package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeetingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptTripMeetingSessionRepository extends JpaRepository<ReceiptTripMeetingSession, Long> {

    List<ReceiptTripMeetingSession> findByReceiptTripMeetingIdxOrderByDisplayOrderAsc(Long receiptTripMeetingIdx);

    void deleteByReceiptTripMeetingIdx(Long receiptTripMeetingIdx);

    @Query("SELECT s FROM ReceiptTripMeetingSession s WHERE s.receiptTripMeetingIdx IN :rtmIdxs ORDER BY s.receiptTripMeetingIdx ASC, s.displayOrder ASC")
    List<ReceiptTripMeetingSession> findByReceiptTripMeetingIdxIn(@Param("rtmIdxs") List<Long> rtmIdxs);

    /**
     * 참여기간 검증용 — 회의 작성자가 본 프로젝트 내에서 작성한 모든 활성 회의 세션 조회.
     * receipt_trip_meeting 과 join 해서 projectIdx 매칭.
     * @SQLRestriction("is_deleted = false") 가 자동 적용된다.
     */
    @Query("SELECT s FROM ReceiptTripMeetingSession s " +
            "WHERE s.authorIdx = :authorIdx " +
            "AND s.receiptTripMeetingIdx IN (" +
            "    SELECT r.idx FROM ReceiptTripMeeting r " +
            "    WHERE r.projectIdx = :projectIdx AND r.deleted = false" +
            ")")
    List<ReceiptTripMeetingSession> findActiveByAuthorAndProject(
            @Param("authorIdx") Long authorIdx,
            @Param("projectIdx") Long projectIdx);
}
