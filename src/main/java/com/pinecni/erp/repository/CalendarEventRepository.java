package com.pinecni.erp.repository;

import com.pinecni.erp.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * CalendarEvent Repository
 */
@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    /**
     * 기간별 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.deletedAt IS NULL " +
            "AND ((e.startDate <= :endDate AND e.endDate >= :startDate) " +
            "OR (e.isRecurring = true AND e.recurringEndDate >= :startDate))")
    List<CalendarEvent> findEventsBetween(LocalDate startDate, LocalDate endDate);

    /**
     * 작성자별 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.creatorIdx = :userIdx AND e.deletedAt IS NULL " +
            "ORDER BY e.startDate DESC")
    List<CalendarEvent> findByCreatorIdx(Long userIdx);

    /**
     * 반복 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.isRecurring = true AND e.deletedAt IS NULL")
    List<CalendarEvent> findRecurringEvents();

    /**
     * 결재 연동 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.approvalIdx = :approvalIdx")
    List<CalendarEvent> findByApprovalIdx(Long approvalIdx);

    /**
     * 이벤트 타입별 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.eventType = :eventType AND e.deletedAt IS NULL")
    List<CalendarEvent> findByEventType(String eventType);

    /**
     * 상태별 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.status = :status AND e.deletedAt IS NULL")
    List<CalendarEvent> findByStatus(String status);
}
