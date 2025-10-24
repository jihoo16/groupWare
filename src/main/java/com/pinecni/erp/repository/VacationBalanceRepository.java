package com.pinecni.erp.repository;

import com.pinecni.erp.entity.VacationBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * VacationBalance Repository
 */
@Repository
public interface VacationBalanceRepository extends JpaRepository<VacationBalance, Long> {

    /**
     * 사용자의 연도별 연차 잔여 조회
     */
    Optional<VacationBalance> findByUserIdxAndYear(Long userIdx, Integer year);

    /**
     * 사용자의 모든 연차 잔여 조회 (최신 연도순)
     */
    @Query("SELECT b FROM VacationBalance b WHERE b.userIdx = :userIdx ORDER BY b.year DESC")
    List<VacationBalance> findByUserIdx(Long userIdx);

    /**
     * 연도별 모든 사용자의 연차 잔여 조회
     */
    @Query("SELECT b FROM VacationBalance b WHERE b.year = :year ORDER BY b.userIdx")
    List<VacationBalance> findByYear(Integer year);

    /**
     * 잔여 연차가 있는 사용자 조회
     */
    @Query("SELECT b FROM VacationBalance b WHERE b.year = :year AND b.remainingDays > 0")
    List<VacationBalance> findByYearWithRemainingDays(Integer year);

    /**
     * 잔여 연차가 부족한 사용자 조회 (지정한 일수 이하)
     */
    @Query("SELECT b FROM VacationBalance b WHERE b.year = :year " +
            "AND b.remainingDays <= :threshold ORDER BY b.remainingDays")
    List<VacationBalance> findLowBalanceUsers(Integer year, Integer threshold);
}
