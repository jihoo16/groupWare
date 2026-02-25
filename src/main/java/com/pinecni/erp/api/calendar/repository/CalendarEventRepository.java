package com.pinecni.erp.api.calendar.repository;

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
     * 기간별 일정 조회 (삭제된 사용자가 생성한 일정 제외)
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.deletedAt IS NULL " +
            "AND e.createdUserIdx IN (SELECT u.idx FROM User u WHERE u.deletedAt IS NULL) " +
            "AND ((e.startDate <= :endDate AND e.endDate >= :startDate) " +
            "OR (e.isRecurring = true AND e.recurringEndDate >= :startDate))")
    List<CalendarEvent> findEventsBetween(LocalDate startDate, LocalDate endDate);

    /**
     * 작성자별 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.createdUserIdx = :userIdx AND e.deletedAt IS NULL " +
            "ORDER BY e.startDate DESC")
    List<CalendarEvent> findByCreatorIdx(Long userIdx);

    /**
     * 반복 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.isRecurring = true AND e.deletedAt IS NULL")
    List<CalendarEvent> findRecurringEvents();

    /**
     * 결재 연동 일정 조회 (삭제된 이벤트 제외)
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.approvalIdx = :approvalIdx AND e.deletedAt IS NULL")
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

    /**
     * 필터링된 일정 조회 (기간 + 팀 + 일정 유형, 삭제된 사용자가 생성한 일정 제외)
     */
    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.deletedAt IS NULL " +
            "AND e.status = 'ACTIVE' " +
            "AND e.createdUserIdx IN (SELECT u.idx FROM User u WHERE u.deletedAt IS NULL) " +
            "AND ((e.startDate <= :endDate AND e.endDate >= :startDate) " +
            "     OR (e.isRecurring = true AND e.recurringEndDate >= :startDate)) " +
            "AND (e.teamIdx IN :teamIds OR e.teamIdx IS NULL) " +
            "AND e.eventType IN :eventTypes " +
            "ORDER BY e.startDate, e.startTime")
    List<CalendarEvent> findEventsWithFilters(
            LocalDate startDate,
            LocalDate endDate,
            List<Long> teamIds,
            List<String> eventTypes
    );

    /**
     * 팀별 일정 개수 조회 (특정 기간)
     */
    @Query("SELECT e.teamIdx, COUNT(e) FROM CalendarEvent e " +
            "WHERE e.deletedAt IS NULL " +
            "AND e.status = 'ACTIVE' " +
            "AND e.teamIdx IS NOT NULL " +
            "AND e.createdUserIdx IN (SELECT u.idx FROM User u WHERE u.deletedAt IS NULL) " +
            "AND ((e.startDate <= :endDate AND e.endDate >= :startDate) " +
            "     OR (e.isRecurring = true AND e.recurringEndDate >= :startDate)) " +
            "GROUP BY e.teamIdx")
    List<Object[]> countEventsByTeam(LocalDate startDate, LocalDate endDate);

    /**
     * 일정 유형별 개수 조회 (특정 기간)
     */
    @Query("SELECT e.eventType, COUNT(e) FROM CalendarEvent e " +
            "WHERE e.deletedAt IS NULL " +
            "AND e.status = 'ACTIVE' " +
            "AND e.createdUserIdx IN (SELECT u.idx FROM User u WHERE u.deletedAt IS NULL) " +
            "AND ((e.startDate <= :endDate AND e.endDate >= :startDate) " +
            "     OR (e.isRecurring = true AND e.recurringEndDate >= :startDate)) " +
            "GROUP BY e.eventType")
    List<Object[]> countEventsByType(LocalDate startDate, LocalDate endDate);

    /**
     * 사용자별 기간 내 일정 조회
     */
    @Query("SELECT e FROM CalendarEvent e WHERE e.createdUserIdx = :userIdx " +
            "AND e.deletedAt IS NULL " +
            "AND ((e.startDate <= :endDate AND e.endDate >= :startDate))")
    List<CalendarEvent> findByUserIdxAndDateRange(Long userIdx, LocalDate startDate, LocalDate endDate);
}
