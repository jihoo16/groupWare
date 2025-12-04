package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

/**
 * ReceiptMeeting Repository
 * 프로젝트 회의록 및 집행 내역 조회
 */
@Repository
public interface ReceiptMeetingRepository extends JpaRepository<ReceiptMeeting, Long> {

    /**
     * 프로젝트별 총 집행액 조회 (활동비)
     * 회의비, 출장비 등 모든 집행액의 합계
     */
    @Query("SELECT COALESCE(SUM(rm.amount), 0) FROM ReceiptMeeting rm " +
            "WHERE rm.projectIdx = :projectIdx ")
    BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);
}
