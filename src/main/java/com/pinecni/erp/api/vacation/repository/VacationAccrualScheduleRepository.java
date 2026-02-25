package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationAccrualSchedule;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VacationAccrualScheduleRepository extends JpaRepository<VacationAccrualSchedule, Long> {

    /**
     * 특정 사용자의 특정 연도 연차 발생 일정 조회
     */
    List<VacationAccrualSchedule> findByUserIdxAndYearOrderByAccrualDateAsc(Long userIdx, Integer year);

    /**
     * 특정 사용자의 특정 연도, 특정 날짜까지 발생한 연차 조회
     */
    @Query("SELECT v FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualDate <= :accrualDate " +
           "ORDER BY v.accrualDate ASC")
    List<VacationAccrualSchedule> findAccruedVacations(
            @Param("userIdx") Long userIdx,
            @Param("year") Integer year,
            @Param("accrualDate") LocalDate accrualDate);

    /**
     * 특정 사용자의 특정 연도, 특정 타입의 발생 내역 조회
     */
    List<VacationAccrualSchedule> findByUserIdxAndYearAndAccrualType(
            Long userIdx, Integer year, String accrualType);

    /**
     * 특정 날짜에 발생 예정인 모든 연차 조회
     */
    List<VacationAccrualSchedule> findByAccrualDate(LocalDate accrualDate);

    /**
     * 특정 사용자의 특정 연도 연차 발생 일정 존재 여부
     */
    boolean existsByUserIdxAndYear(Long userIdx, Integer year);

    /**
     * 특정 연도의 연차 발생 일정 존재 여부 (전체 사용자)
     */
    boolean existsByYear(Integer year);

    /**
     * 특정 사용자의 특정 연도, 특정 날짜, 특정 타입 중복 체크
     */
    boolean existsByUserIdxAndYearAndAccrualDateAndAccrualType(
            Long userIdx, Integer year, LocalDate accrualDate, String accrualType);

    /**
     * 특정 사용자의 특정 연도 모든 발생 일정 삭제 (bulk DELETE — 즉시 flush)
     */
    @Modifying
    @Query("DELETE FROM VacationAccrualSchedule v WHERE v.userIdx = :userIdx AND v.year = :year")
    void deleteByUserIdxAndYear(@Param("userIdx") Long userIdx, @Param("year") Integer year);

    /**
     * 특정 사용자의 모든 발생 일정 삭제
     */
    void deleteByUserIdx(Long userIdx);

    // ── vacation_balance 계산용 집계 쿼리 (신규) ──────────────────────────

    /**
     * 기본연차 + 근속가산 합계 (연도 기준, 오늘까지 발생분)
     * annual_leave_days 계산에 사용
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualType IN ('기본연차', '근속가산') " +
           "AND v.accrualDate <= :today " +
           "AND v.isExpired = false")
    BigDecimal sumAnnualLeaveDays(@Param("userIdx") Long userIdx,
                                  @Param("year") Integer year,
                                  @Param("today") LocalDate today);

    /**
     * 비례연차 합계 (연도 기준, 오늘까지 발생분)
     * proportional_days 계산에 사용
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualType = '비례연차' " +
           "AND v.accrualDate <= :today " +
           "AND v.isExpired = false")
    BigDecimal sumProportionalDays(@Param("userIdx") Long userIdx,
                                   @Param("year") Integer year,
                                   @Param("today") LocalDate today);

    /**
     * 보상휴가 합계 (연도 기준, 오늘까지 발생분)
     * compensatory_days 계산에 사용
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualType = '보상휴가' " +
           "AND v.accrualDate <= :today " +
           "AND v.isExpired = false")
    BigDecimal sumCompensatoryDays(@Param("userIdx") Long userIdx,
                                   @Param("year") Integer year,
                                   @Param("today") LocalDate today);

    /**
     * 유효 월차 합계 (연도 기준, 소멸 전, 만료일 미도래)
     * monthly_leave_days 계산에 사용.
     * ※ 연도별 집계이므로 accrual_schedule.year = :year 기준
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualType = '월차' " +
           "AND v.accrualDate <= :today " +
           "AND v.isExpired = false " +
           "AND v.expiryDate >= :today")
    BigDecimal sumValidMonthlyDays(@Param("userIdx") Long userIdx,
                                   @Param("year") Integer year,
                                   @Param("today") LocalDate today);

    /**
     * 소멸된 월차 합계 (연도 기준)
     * expired_monthly_days 계산에 사용
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualType = '월차' " +
           "AND v.isExpired = true")
    BigDecimal sumExpiredMonthlyDays(@Param("userIdx") Long userIdx,
                                     @Param("year") Integer year);

    /**
     * 다음 발생 예정 accrual 조회 (오늘 이후 가장 빠른 것)
     * next_accrual_* 계산에 사용. Pageable 로 limit 1 처리.
     */
    @Query("SELECT v FROM VacationAccrualSchedule v " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.accrualDate > :today " +
           "ORDER BY v.accrualDate ASC")
    List<VacationAccrualSchedule> findUpcomingAccruals(@Param("userIdx") Long userIdx,
                                                        @Param("today") LocalDate today,
                                                        Pageable pageable);

    /**
     * 만료된 월차 is_expired = true 로 일괄 업데이트
     * 스케줄러(매일 00:01)에서 호출
     */
    @Modifying
    @Query("UPDATE VacationAccrualSchedule v SET v.isExpired = true " +
           "WHERE v.accrualType = '월차' " +
           "AND v.isExpired = false " +
           "AND v.expiryDate < :today")
    int markExpiredMonthly(@Param("today") LocalDate today);

    /**
     * 과거 연도 즉시 생성 후 만료 처리
     * expiryDate < effectiveDate 인 월차를 isExpired=true 로 업데이트
     * (스케줄러가 돌지 않은 과거 연도 데이터를 on-demand 생성할 때 사용)
     */
    @Modifying
    @Query("UPDATE VacationAccrualSchedule v SET v.isExpired = true " +
           "WHERE v.userIdx = :userIdx " +
           "AND v.year = :year " +
           "AND v.accrualType = '월차' " +
           "AND v.isExpired = false " +
           "AND v.expiryDate < :effectiveDate")
    int markExpiredMonthlyForUser(@Param("userIdx") Long userIdx,
                                   @Param("year") Integer year,
                                   @Param("effectiveDate") LocalDate effectiveDate);
}
