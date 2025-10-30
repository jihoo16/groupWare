package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * VacationRequest Repository
 */
@Repository
public interface VacationRequestRepository extends JpaRepository<VacationRequest, Long> {

    /**
     * 문서번호로 조회
     */
    Optional<VacationRequest> findByDocumentIdx(Long documentIdx);

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
            "AND v.startDate <= :endDate AND v.endDate >= :startDate " +
            "AND v.cancelledAt IS NULL")
    List<VacationRequest> findActiveByUserIdxAndDateRange(Long userIdx,
                                                           LocalDate startDate,
                                                           LocalDate endDate);

    /**
     * 승인된 연차 조회
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.approvedAt IS NOT NULL " +
            "AND v.cancelledAt IS NULL ORDER BY v.approvedAt DESC")
    List<VacationRequest> findApprovedVacations();

    /**
     * 사용자의 연간 연차 사용 내역
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.userIdx = :userIdx " +
            "AND YEAR(v.startDate) = :year AND v.approvedAt IS NOT NULL " +
            "AND v.cancelledAt IS NULL")
    List<VacationRequest> findApprovedByUserIdxAndYear(Long userIdx, int year);
}
