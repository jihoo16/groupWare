package com.pinecni.erp.api.document.repository;
import java.util.List;

import com.pinecni.erp.entity.DocumentSequence;
import com.pinecni.erp.entity.MeetingsMinutes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface MeetingMinutesRepository extends JpaRepository<MeetingsMinutes, Long> {
    List<MeetingsMinutes> findByUserIdxOrderByCreatedAtDesc(Long userIdx);

    @Query("SELECT m from MeetingsMinutes m order by m.createdAt DESC")
    List<MeetingsMinutes> findAllOrderByCreatedAtDesc();

    /**
     * 프로젝트별 회의록 목록 조회 (최신순)
     */
    List<MeetingsMinutes> findByProjectIdxOrderByCreatedAtDesc(Long projectIdx);
}
