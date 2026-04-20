package com.pinecni.erp.api.signature.repository;

import com.pinecni.erp.entity.SignatureSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 서명 세션 Repository
 */
@Repository
public interface SignatureSessionRepository extends JpaRepository<SignatureSession, Long> {

    /**
     * 토큰으로 세션 조회 (QR 스캔 시 사용)
     */
    Optional<SignatureSession> findBySessionToken(String sessionToken);

    /**
     * 문서 + 서명자의 활성 세션 조회 (PENDING 상태)
     * 새 QR 생성 시 기존 PENDING 세션 취소용
     */
    List<SignatureSession> findByDocumentIdxAndSignerUserIdxAndStatus(
            Long documentIdx, Long signerUserIdx, String status);

    /**
     * 만료된 세션 조회 (스케줄러용)
     * status가 종료 상태가 아닌데 expires_at이 지난 세션
     */
    @Query("SELECT s FROM SignatureSession s " +
           "WHERE s.expiresAt < :now " +
           "AND s.status NOT IN ('C1304', 'C1305', 'C1306')")
    List<SignatureSession> findExpiredSessions(@Param("now") LocalDateTime now);

    /**
     * 만료된 세션 일괄 EXPIRED 처리 (스케줄러용)
     */
    @Modifying
    @Query("UPDATE SignatureSession s SET s.status = 'C1305' " +
           "WHERE s.expiresAt < :now " +
           "AND s.status NOT IN ('C1304', 'C1305', 'C1306')")
    int markExpiredSessions(@Param("now") LocalDateTime now);
}
