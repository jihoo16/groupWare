package com.pinecni.erp.api.signature.repository;

import com.pinecni.erp.entity.SignatureRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 서명 요청 Repository
 */
@Repository
public interface SignatureRequestRepository extends JpaRepository<SignatureRequest, Long> {

    /**
     * 사용자의 미처리 서명 요청 목록 (홈 화면 위젯용)
     */
    List<SignatureRequest> findBySignerUserIdxAndIsCompletedFalseOrderByCreatedAtDesc(Long signerUserIdx);

    /**
     * 사용자의 미처리 서명 건수 (알림 배지용)
     */
    long countBySignerUserIdxAndIsCompletedFalse(Long signerUserIdx);

    /**
     * 문서의 모든 서명 요청 조회
     */
    List<SignatureRequest> findByDocumentIdx(Long documentIdx);

    /**
     * document_signature_idx로 요청 완료 처리
     */
    @Modifying
    @Query("UPDATE SignatureRequest sr SET sr.isCompleted = true, sr.completedAt = CURRENT_TIMESTAMP " +
           "WHERE sr.documentSignatureIdx = :documentSignatureIdx")
    void markCompletedByDocumentSignatureIdx(@Param("documentSignatureIdx") Long documentSignatureIdx);
}
