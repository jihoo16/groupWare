package com.pinecni.erp.api.approval.repository;

import com.pinecni.erp.entity.ApprovalLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ApprovalLine Repository
 */
@Repository
public interface ApprovalLineRepository extends JpaRepository<ApprovalLine, Long> {

    /**
     * 문서별 결재선 조회 (순서대로)
     */
    @Query("SELECT l FROM ApprovalLine l WHERE l.documentIdx = :documentIdx ORDER BY l.sequence")
    List<ApprovalLine> findByDocumentIdx(Long documentIdx);

    /**
     * 결재자별 결재 대기 문서 조회
     */
    @Query("SELECT l FROM ApprovalLine l WHERE l.approverUserIdx = :userIdx " +
            "AND l.status = '대기' ORDER BY l.sequence")
    List<ApprovalLine> findPendingByApproverUserIdx(Long userIdx);

    /**
     * 결재자별 모든 결재선 조회
     */
    @Query("SELECT l FROM ApprovalLine l WHERE l.approverUserIdx = :userIdx " +
            "ORDER BY l.approvedAt DESC, l.rejectedAt DESC")
    List<ApprovalLine> findByApproverUserIdx(Long userIdx);

    /**
     * 문서의 현재 결재 차례 조회
     */
    @Query("SELECT l FROM ApprovalLine l WHERE l.documentIdx = :documentIdx " +
            "AND l.status = '대기' ORDER BY l.sequence")
    Optional<ApprovalLine> findCurrentApprovalTurn(Long documentIdx);

    /**
     * 문서의 결재 완료 여부 확인
     */
    @Query("SELECT COUNT(l) FROM ApprovalLine l WHERE l.documentIdx = :documentIdx " +
            "AND l.status != '완료'")
    long countPendingByDocumentIdx(Long documentIdx);
}
