package com.pinecni.erp.api.calendar.repository;

import com.pinecni.erp.api.calendar.entity.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 공휴일 Repository
 */
@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    /**
     * 특정 날짜의 공휴일 조회
     */
    Optional<Holiday> findByHolidayDate(LocalDate holidayDate);

    /**
     * 특정 년도의 공휴일 목록 조회
     */
    List<Holiday> findByYearOrderByHolidayDateAsc(Integer year);

    /**
     * 기간 내 공휴일 목록 조회
     */
    @Query("SELECT h FROM Holiday h WHERE h.holidayDate BETWEEN :startDate AND :endDate ORDER BY h.holidayDate ASC")
    List<Holiday> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    /**
     * 특정 날짜가 공휴일인지 확인
     */
    boolean existsByHolidayDate(LocalDate holidayDate);

    /**
     * 특정 년도의 공휴일 삭제
     */
    @Modifying
    @Query("DELETE FROM Holiday h WHERE h.year = :year")
    void deleteByYear(@Param("year") Integer year);
}
