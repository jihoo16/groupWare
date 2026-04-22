package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * ReceiptTrip Repository
 * 연구비증빙 단독출장 및 집행 내역 조회
 */
@Repository
public interface ReceiptTripRepository extends JpaRepository<ReceiptTrip, Long> {

    /**
     * 프로젝트별 총 출장비 조회 (삭제되지 않은 건만 합산)
     */
    @Query("SELECT COALESCE(SUM(COALESCE(rt.totalFee, 0)), 0) " +
            "FROM ReceiptTrip rt " +
            "WHERE rt.projectIdx = :projectIdx AND rt.deleted = false")
    BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);

    /**
     * 프로젝트별 문서번호 prefix 기준 출장비 조회 (삭제되지 않은 건만 합산)
     */
    @Query("SELECT COALESCE(SUM(COALESCE(rt.totalFee, 0)), 0) " +
            "FROM ReceiptTrip rt " +
            "JOIN rt.approvalDocument ad " +
            "WHERE rt.projectIdx = :projectIdx " +
            "AND ad.documentNo LIKE CONCAT(:prefix, '%') " +
            "AND rt.deleted = false")
    BigDecimal sumAmountByProjectIdxAndDocPrefix(@Param("projectIdx") Long projectIdx,
                                                  @Param("prefix") String prefix);

    /**
     * 프로젝트별 출장 목록 조회 (삭제되지 않은 건, 출장일 내림차순)
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "WHERE rt.projectIdx = :projectIdx AND rt.deleted = false " +
            "ORDER BY rt.tripDate DESC")
    List<ReceiptTrip> findByProjectIdxOrderByTripDateDesc(@Param("projectIdx") Long projectIdx);

    /**
     * 작성자별 출장 목록 조회 (삭제되지 않은 건, 출장일 내림차순)
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "WHERE rt.drafterUserIdx = :drafterUserIdx AND rt.deleted = false " +
            "ORDER BY rt.tripDate DESC")
    List<ReceiptTrip> findByDrafterUserIdxOrderByTripDateDesc(@Param("drafterUserIdx") Long drafterUserIdx);

    /**
     * 출장 전체 목록 조회 (삭제되지 않은 건, 출장일 내림차순) — status 컬럼 제거로 단순화
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "WHERE rt.deleted = false " +
            "ORDER BY rt.tripDate DESC")
    List<ReceiptTrip> findByStatusOrderByTripDateDesc(@Param("status") String status);

    /**
     * 출장 상세 조회 (참석자는 receipt_attendee 통합 테이블에서 별도 조회)
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "WHERE rt.idx = :idx")
    Optional<ReceiptTrip> findByIdWithDetails(@Param("idx") Long idx);

    /**
     * 전체 출장 목록 조회 (삭제되지 않은 건, 출장일 내림차순)
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "WHERE rt.deleted = false " +
            "ORDER BY rt.tripDate DESC")
    List<ReceiptTrip> findAllByOrderByTripDateDesc();

    /**
     * ApprovalDocument idx로 출장 조회 (삭제되지 않은 건)
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "WHERE rt.documentIdx = :documentIdx AND rt.deleted = false")
    Optional<ReceiptTrip> findByDocumentIdx(@Param("documentIdx") Long documentIdx);

    /**
     * 참여기간 검증용 — 작성자가 본 프로젝트 내에서 작성한 모든 활성 출장 조회.
     * 멤버 기간 단축 시 orphan 사전 검사에서 사용.
     * (출장은 박 수 = duration, 종료일 = tripDate + duration 까지 검사 필요 — 메모리에서 처리)
     */
    @Query("SELECT rt FROM ReceiptTrip rt " +
            "WHERE rt.drafterUserIdx = :authorIdx " +
            "AND rt.projectIdx = :projectIdx " +
            "AND rt.deleted = false")
    List<ReceiptTrip> findActiveByAuthorAndProject(
            @Param("authorIdx") Long authorIdx,
            @Param("projectIdx") Long projectIdx);

    @Query("SELECT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.approvalDocument " +
            "LEFT JOIN FETCH rt.project " +
            "WHERE rt.documentIdx IN :documentIdxs AND rt.deleted = false")
    List<ReceiptTrip> findByDocumentIdxIn(@Param("documentIdxs") List<Long> documentIdxs);
}
