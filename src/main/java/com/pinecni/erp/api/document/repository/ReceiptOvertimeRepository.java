package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptOvertime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * ReceiptOvertime Repository
 * 연구비증빙 야근식대 조회
 */
@Repository
public interface ReceiptOvertimeRepository extends JpaRepository<ReceiptOvertime, Long> {

    /**
     * 프로젝트별 총 야근식대 집행액 조회
     */
    @Query("SELECT COALESCE(SUM(ro.totalAmount), 0) FROM ReceiptOvertime ro " +
            "WHERE ro.projectIdx = :projectIdx AND ro.isDeleted = false")
    BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);

    /**
     * 프로젝트별 야근식대 목록 조회
     */
    @Query("SELECT ro FROM ReceiptOvertime ro WHERE ro.projectIdx = :projectIdx ORDER BY ro.overtimeDate DESC")
    List<ReceiptOvertime> findByProjectIdxOrderByOvertimeDateDesc(@Param("projectIdx") Long projectIdx);

    /**
     * 작성자별 야근식대 목록 조회
     */
    List<ReceiptOvertime> findByAuthorIdxOrderByOvertimeDateDesc(Long authorIdx);

    /**
     * 전체 야근식대 목록 조회 (최신순)
     */
    List<ReceiptOvertime> findAllByOrderByOvertimeDateDesc();

    /**
     * ApprovalDocument IDX로 야근식대 조회
     */
    Optional<ReceiptOvertime> findByDocumentIdx(Long documentIdx);

    /**
     * 참여기간 검증용 — 작성자가 본 프로젝트 내에서 작성한 모든 활성 야근식대 조회.
     */
    @Query("SELECT ro FROM ReceiptOvertime ro " +
            "WHERE ro.authorIdx = :authorIdx " +
            "AND ro.projectIdx = :projectIdx " +
            "AND ro.isDeleted = false")
    List<ReceiptOvertime> findActiveByAuthorAndProject(
            @Param("authorIdx") Long authorIdx,
            @Param("projectIdx") Long projectIdx);
}
