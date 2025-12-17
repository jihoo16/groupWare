package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationAccrualSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
     * 특정 사용자의 특정 연도 모든 발생 일정 삭제
     */
    void deleteByUserIdxAndYear(Long userIdx, Integer year);

    /**
     * 특정 사용자의 모든 발생 일정 삭제
     */
    void deleteByUserIdx(Long userIdx);
}
