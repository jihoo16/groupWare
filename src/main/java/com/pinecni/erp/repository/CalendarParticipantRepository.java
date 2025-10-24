package com.pinecni.erp.repository;

import com.pinecni.erp.entity.CalendarParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * CalendarParticipant Repository
 */
@Repository
public interface CalendarParticipantRepository extends JpaRepository<CalendarParticipant, Long> {

    /**
     * 일정별 참석자 목록 조회
     */
    List<CalendarParticipant> findByEventIdx(Long eventIdx);

    /**
     * 사용자별 참석 일정 조회
     */
    @Query("SELECT p FROM CalendarParticipant p WHERE p.userIdx = :userIdx " +
            "ORDER BY p.createdAt DESC")
    List<CalendarParticipant> findByUserIdx(Long userIdx);

    /**
     * 사용자의 참석 응답 상태별 조회
     */
    @Query("SELECT p FROM CalendarParticipant p WHERE p.userIdx = :userIdx " +
            "AND p.participationStatus = :status")
    List<CalendarParticipant> findByUserIdxAndParticipationStatus(Long userIdx, String status);
}
