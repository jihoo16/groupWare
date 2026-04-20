package com.pinecni.erp.repository;

import com.pinecni.erp.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 감사 로그 Repository (append-only, 조회·페이징 중심)
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * 사용자별 행위 이력 조회 (페이징)
     */
    Page<AuditLog> findByUserIdxOrderByCreatedAtDesc(Long userIdx, Pageable pageable);

    /**
     * 문서별 행위 이력 조회 (문서 감사 추적용)
     */
    List<AuditLog> findByDocumentIdxOrderByCreatedAtDesc(Long documentIdx);

    /**
     * 기간별 감사 로그 조회 (관리자 페이지 필터용)
     */
    @Query("SELECT al FROM AuditLog al " +
           "WHERE al.createdAt >= :start AND al.createdAt < :end " +
           "ORDER BY al.createdAt DESC")
    Page<AuditLog> findByPeriod(@Param("start") LocalDateTime start,
                                 @Param("end") LocalDateTime end,
                                 Pageable pageable);

    /**
     * 복합 필터 조회 (관리자 페이지 고급 검색용)
     * NULL 파라미터는 해당 조건 무시
     */
    @Query("SELECT al FROM AuditLog al " +
           "WHERE (:userIdx IS NULL OR al.userIdx = :userIdx) " +
           "AND (:targetType IS NULL OR al.targetType = :targetType) " +
           "AND (:action IS NULL OR al.action = :action) " +
           "AND (:documentIdx IS NULL OR al.documentIdx = :documentIdx) " +
           "AND (:start IS NULL OR al.createdAt >= :start) " +
           "AND (:end IS NULL OR al.createdAt < :end) " +
           "ORDER BY al.createdAt DESC")
    Page<AuditLog> search(@Param("userIdx") Long userIdx,
                           @Param("targetType") String targetType,
                           @Param("action") String action,
                           @Param("documentIdx") Long documentIdx,
                           @Param("start") LocalDateTime start,
                           @Param("end") LocalDateTime end,
                           Pageable pageable);
}
