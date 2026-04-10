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
            "WHERE rm.projectIdx = :projectIdx AND rm.isDeleted = false")
    BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);

    /**
     * 프로젝트별 문서번호 prefix 기준 집행액 조회
     */
    @Query("SELECT COALESCE(SUM(rm.amount), 0) FROM ReceiptMeeting rm " +
            "JOIN rm.approvalDocument ad " +
            "WHERE rm.projectIdx = :projectIdx AND ad.documentNo LIKE CONCAT(:prefix, '%')")
    BigDecimal sumAmountByProjectIdxAndDocPrefix(@Param("projectIdx") Long projectIdx, @Param("prefix") String prefix);

    /**
     * 프로젝트별 회의록 목록 조회 (문서번호 포함 - JOIN FETCH)
     */
    @Query("SELECT rm FROM ReceiptMeeting rm " +
            "LEFT JOIN FETCH rm.approvalDocument " +
            "WHERE rm.projectIdx = :projectIdx " +
            "ORDER BY rm.meetingDate DESC")
    List<ReceiptMeeting> findByProjectIdxOrderByMeetingDateDesc(@Param("projectIdx") Long projectIdx);

    /**
     * 작성자별 회의록 목록 조회 (문서번호 포함 - JOIN FETCH)
     */
    @Query("SELECT rm FROM ReceiptMeeting rm " +
            "LEFT JOIN FETCH rm.approvalDocument " +
            "WHERE rm.authorIdx = :authorIdx " +
            "ORDER BY rm.meetingDate DESC")
    List<ReceiptMeeting> findByAuthorIdxOrderByMeetingDateDesc(@Param("authorIdx") Long authorIdx);

    /**
     * 회의록 상세 조회 (문서번호 포함 - JOIN FETCH)
     * Note: attendees는 통합 테이블로 변경되어 별도 조회 필요 (ReceiptAttendeeRepository 사용)
     */
    @Query("SELECT rm FROM ReceiptMeeting rm " +
            "LEFT JOIN FETCH rm.approvalDocument " +
            "WHERE rm.idx = :idx")
    Optional<ReceiptMeeting> findByIdWithDetails(@Param("idx") Long idx);

    /**
     * 전체 회의록 목록 조회 (최신순, 문서번호 포함 - JOIN FETCH)
     */
    @Query("SELECT rm FROM ReceiptMeeting rm " +
            "LEFT JOIN FETCH rm.approvalDocument " +
            "ORDER BY rm.meetingDate DESC")
    List<ReceiptMeeting> findAllByOrderByMeetingDateDesc();

    /**
     * ApprovalDocument idx로 회의록 조회 (문서번호 포함 - JOIN FETCH)
     */
    @Query("SELECT rm FROM ReceiptMeeting rm " +
            "LEFT JOIN FETCH rm.approvalDocument " +
            "WHERE rm.documentIdx = :documentIdx")
    Optional<ReceiptMeeting> findByDocumentIdx(@Param("documentIdx") Long documentIdx);

    /**
     * 참여기간 검증용 — 작성자가 본 프로젝트 내에서 작성한 모든 활성 회의록 조회.
     * 멤버 기간 단축 시 orphan 사전 검사에서 사용.
     */
    @Query("SELECT rm FROM ReceiptMeeting rm " +
            "WHERE rm.authorIdx = :authorIdx " +
            "AND rm.projectIdx = :projectIdx " +
            "AND rm.isDeleted = false")
    List<ReceiptMeeting> findActiveByAuthorAndProject(
            @Param("authorIdx") Long authorIdx,
            @Param("projectIdx") Long projectIdx);
}
