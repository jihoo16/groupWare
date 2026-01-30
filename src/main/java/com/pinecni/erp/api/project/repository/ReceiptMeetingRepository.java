package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

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

    /**
     * 프로젝트별 회의록 목록 조회
     */
    List<ReceiptMeeting> findByProjectIdxOrderByMeetingDateDesc(Long projectIdx);

    /**
     * 작성자별 회의록 목록 조회
     */
    List<ReceiptMeeting> findByAuthorIdxOrderByMeetingDateDesc(Long authorIdx);

    /**
     * 상태별 회의록 목록 조회
     */
    List<ReceiptMeeting> findByStatusOrderByMeetingDateDesc(String status);

    /**
     * 문서번호로 회의록 조회
     */
    Optional<ReceiptMeeting> findByDocumentNumber(String documentNumber);

    /**
     * 참석자 정보를 포함한 회의록 상세 조회
     * Note: approvals는 lazy loading으로 필요시 별도 조회
     */
    @Query("SELECT DISTINCT rm FROM ReceiptMeeting rm " +
            "LEFT JOIN FETCH rm.attendees " +
            "WHERE rm.idx = :idx")
    Optional<ReceiptMeeting> findByIdWithDetails(@Param("idx") Long idx);

    /**
     * 전체 회의록 목록 조회 (최신순)
     */
    List<ReceiptMeeting> findAllByOrderByMeetingDateDesc();

    /**
     * ApprovalDocument idx로 회의록 조회
     */
    Optional<ReceiptMeeting> findByDocumentIdx(Long documentIdx);
}
