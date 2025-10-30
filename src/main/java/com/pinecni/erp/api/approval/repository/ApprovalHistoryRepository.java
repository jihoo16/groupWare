package com.pinecni.erp.api.approval.repository;

import com.pinecni.erp.entity.ApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ApprovalHistory Repository
 */
@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {

    /**
     * 문서별 이력 조회 (최신순)
     */
    @Query("SELECT h FROM ApprovalHistory h WHERE h.documentIdx = :documentIdx " +
            "ORDER BY h.actionedAt DESC")
    List<ApprovalHistory> findByDocumentIdx(Long documentIdx);

    /**
     * 액션 타입별 이력 조회
     */
    @Query("SELECT h FROM ApprovalHistory h WHERE h.documentIdx = :documentIdx " +
            "AND h.actionType = :actionType ORDER BY h.actionedAt DESC")
    List<ApprovalHistory> findByDocumentIdxAndActionType(Long documentIdx, String actionType);

    /**
     * 사용자별 액션 이력 조회
     */
    @Query("SELECT h FROM ApprovalHistory h WHERE h.actionedUserIdx = :userIdx " +
            "ORDER BY h.actionedAt DESC")
    List<ApprovalHistory> findByActionedUserIdx(Long userIdx);

    /**
     * 기간별 이력 조회
     */
    @Query("SELECT h FROM ApprovalHistory h WHERE h.documentIdx = :documentIdx " +
            "AND h.actionedAt BETWEEN :startDate AND :endDate ORDER BY h.actionedAt DESC")
    List<ApprovalHistory> findByDocumentIdxAndDateRange(Long documentIdx,
                                                         LocalDateTime startDate,
                                                         LocalDateTime endDate);
}
