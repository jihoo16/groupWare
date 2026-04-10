package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * 연구비증빙 출장+회의 Repository
 */
@Repository
public interface ReceiptTripMeetingRepository extends JpaRepository<ReceiptTripMeeting, Long> {

    /**
     * 프로젝트별 출장+회의 목록 (출장일 내림차순)
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "LEFT JOIN FETCH rtm.approvalDocument " +
           "WHERE rtm.projectIdx = :projectIdx " +
           "ORDER BY rtm.tripDate DESC")
    List<ReceiptTripMeeting> findByProjectIdxOrderByTripDateDesc(@Param("projectIdx") Long projectIdx);

    /**
     * 작성자별 출장+회의 목록 (출장일 내림차순)
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "LEFT JOIN FETCH rtm.approvalDocument " +
           "WHERE rtm.drafterUserIdx = :drafterUserIdx " +
           "ORDER BY rtm.tripDate DESC")
    List<ReceiptTripMeeting> findByDrafterUserIdxOrderByTripDateDesc(@Param("drafterUserIdx") Long drafterUserIdx);

    /**
     * ApprovalDocument idx로 조회
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "WHERE rtm.documentIdx = :documentIdx")
    Optional<ReceiptTripMeeting> findByDocumentIdx(@Param("documentIdx") Long documentIdx);

    /**
     * 프로젝트별 출장+회의 비용 합계
     */
    @Query("SELECT COALESCE(SUM(COALESCE(rtm.totalFee, 0)), 0) " +
           "FROM ReceiptTripMeeting rtm " +
           "WHERE rtm.projectIdx = :projectIdx AND rtm.deleted = false")
    BigDecimal sumTripFeeByProjectIdx(@Param("projectIdx") Long projectIdx);

    /**
     * 참여기간 검증용 — 작성자(drafter)가 본 프로젝트 내에서 작성한 모든 활성 출장+회의 조회.
     * (출장 기간 = tripDate ~ tripDate + duration 까지 검사 — 메모리에서 처리)
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "WHERE rtm.drafterUserIdx = :authorIdx " +
           "AND rtm.projectIdx = :projectIdx " +
           "AND rtm.deleted = false")
    List<ReceiptTripMeeting> findActiveByAuthorAndProject(
            @Param("authorIdx") Long authorIdx,
            @Param("projectIdx") Long projectIdx);
}
