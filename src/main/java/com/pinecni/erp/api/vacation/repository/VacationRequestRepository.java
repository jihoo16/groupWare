package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * VacationRequest Repository
 */
@Repository
public interface VacationRequestRepository extends JpaRepository<VacationRequest, Long> {

    /**
     * 사용자별 연차 신청 조회 (최신순)
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.userIdx = :userIdx " +
            "ORDER BY v.createdAt DESC")
    List<VacationRequest> findByUserIdx(Long userIdx);

    /**
     * 연차 유형별 조회
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.vacationType = :vacationType " +
            "ORDER BY v.createdAt DESC")
    List<VacationRequest> findByVacationType(String vacationType);

    /**
     * 기간별 연차 신청 조회
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.startDate <= :endDate " +
            "AND v.endDate >= :startDate ORDER BY v.startDate")
    List<VacationRequest> findByDateRange(LocalDate startDate, LocalDate endDate);

    /**
     * 사용자의 기간별 연차 신청 조회
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.userIdx = :userIdx " +
            "AND v.startDate <= :endDate AND v.endDate >= :startDate")
    List<VacationRequest> findByUserIdxAndDateRange(Long userIdx,
                                                     LocalDate startDate,
                                                     LocalDate endDate);

    /**
     * 사용자의 연간 연차 사용 내역
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.userIdx = :userIdx " +
            "AND YEAR(v.startDate) = :year")
    List<VacationRequest> findByUserIdxAndYear(Long userIdx, int year);

    /**
     * 사용자의 연간 총 사용 연차 일수 합계
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationRequest v " +
            "WHERE v.userIdx = :userIdx AND YEAR(v.startDate) = :year")
    BigDecimal sumDaysByUserIdxAndYear(Long userIdx, int year);

    /**
     * 사용자의 특정 연차 유형 신청 이력 확인 (경조사 등)
     * - vacationType에 특정 문자열이 포함되어 있는지 확인
     * - 예: vacationType="본인결혼" -> "경조사(본인결혼)" 검색
     */
    boolean existsByUserIdxAndVacationTypeContaining(Long userIdx, String vacationType);

    /**
     * 문서 IDX로 연차 신청 목록 조회
     * - 한 문서에 여러 개의 연차 기간이 있을 수 있음
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.documentIdx = :documentIdx " +
            "ORDER BY v.startDate")
    List<VacationRequest> findByDocumentIdx(Long documentIdx);
}
