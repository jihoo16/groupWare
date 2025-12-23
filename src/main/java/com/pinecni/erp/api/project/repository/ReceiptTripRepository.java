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
 * 연구비증빙 출장 및 집행 내역 조회
 */
@Repository
public interface ReceiptTripRepository extends JpaRepository<ReceiptTrip, Long> {

    /**
     * 프로젝트별 총 출장비 조회 (4개 비용 항목 합계)
     */
    @Query("SELECT COALESCE(SUM(" +
            "COALESCE(rt.transportationFee, 0) + " +
            "COALESCE(rt.accommodationFee, 0) + " +
            "COALESCE(rt.mealFee, 0) + " +
            "COALESCE(rt.otherFee, 0)), 0) " +
            "FROM ReceiptTrip rt " +
            "WHERE rt.projectIdx = :projectIdx")
    BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);

    /**
     * 프로젝트별 출장 목록 조회
     */
    List<ReceiptTrip> findByProjectIdxOrderByTripDateDesc(Long projectIdx);

    /**
     * 작성자별 출장 목록 조회
     */
    List<ReceiptTrip> findByAuthorIdxOrderByTripDateDesc(Long authorIdx);

    /**
     * 상태별 출장 목록 조회
     */
    List<ReceiptTrip> findByStatusOrderByTripDateDesc(String status);

    /**
     * 문서번호로 출장 조회
     */
    Optional<ReceiptTrip> findByDocumentNumber(String documentNumber);

    /**
     * 참석자 정보를 포함한 출장 상세 조회
     */
    @Query("SELECT DISTINCT rt FROM ReceiptTrip rt " +
            "LEFT JOIN FETCH rt.attendees " +
            "WHERE rt.idx = :idx")
    Optional<ReceiptTrip> findByIdWithDetails(@Param("idx") Long idx);

    /**
     * 전체 출장 목록 조회 (최신순)
     */
    List<ReceiptTrip> findAllByOrderByTripDateDesc();
}
