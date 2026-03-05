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
 * 연구비증빙 회의+출장 Repository
 */
@Repository
public interface ReceiptTripMeetingRepository extends JpaRepository<ReceiptTripMeeting, Long> {

    /**
     * 프로젝트별 회의+출장 목록 (삭제되지 않은 건, 출장일 내림차순)
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "LEFT JOIN FETCH rtm.approvalDocument " +
           "WHERE rtm.projectIdx = :projectIdx AND rtm.isDeleted = false " +
           "ORDER BY rtm.tripDate DESC")
    List<ReceiptTripMeeting> findByProjectIdxOrderByTripDateDesc(@Param("projectIdx") Long projectIdx);

    /**
     * 작성자별 회의+출장 목록 (삭제되지 않은 건, 출장일 내림차순)
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "LEFT JOIN FETCH rtm.approvalDocument " +
           "WHERE rtm.authorIdx = :authorIdx AND rtm.isDeleted = false " +
           "ORDER BY rtm.tripDate DESC")
    List<ReceiptTripMeeting> findByAuthorIdxOrderByTripDateDesc(@Param("authorIdx") Long authorIdx);

    /**
     * ApprovalDocument idx로 조회 (삭제되지 않은 건)
     */
    @Query("SELECT rtm FROM ReceiptTripMeeting rtm " +
           "WHERE rtm.documentIdx = :documentIdx AND rtm.isDeleted = false")
    Optional<ReceiptTripMeeting> findByDocumentIdx(@Param("documentIdx") Long documentIdx);

    /**
     * 프로젝트별 출장비 합계 (삭제되지 않은 건)
     */
    @Query("SELECT COALESCE(SUM(" +
           "COALESCE(rtm.transportationFee, 0) + " +
           "COALESCE(rtm.accommodationFee, 0) + " +
           "COALESCE(rtm.mealFee, 0) + " +
           "COALESCE(rtm.otherFee, 0)), 0) " +
           "FROM ReceiptTripMeeting rtm " +
           "WHERE rtm.projectIdx = :projectIdx AND rtm.isDeleted = false")
    BigDecimal sumTripFeeByProjectIdx(@Param("projectIdx") Long projectIdx);

    /**
     * 프로젝트별 회의비 합계 (삭제되지 않은 건)
     */
    @Query("SELECT COALESCE(SUM(COALESCE(rtm.amount, 0)), 0) " +
           "FROM ReceiptTripMeeting rtm " +
           "WHERE rtm.projectIdx = :projectIdx AND rtm.isDeleted = false")
    BigDecimal sumMeetingAmountByProjectIdx(@Param("projectIdx") Long projectIdx);
}
