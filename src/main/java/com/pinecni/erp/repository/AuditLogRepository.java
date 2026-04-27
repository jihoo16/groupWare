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
     * NULL 파라미터는 해당 조건 무시.
     *
     * <p>PostgreSQL 은 JDBC 로 들어온 untyped NULL 의 타입을 추론 못해
     * {@code ERROR: could not determine data type of parameter $N} 으로 쿼리가
     * 깨진다. 해결책은 두 가지가 있는데
     *   1. 모든 NULL 비교에 CAST 를 박기 (JPQL CAST)
     *   2. 네이티브 쿼리로 명시적 CAST
     * 여기선 JPQL 로 유지하되 각 파라미터에 Hibernate 타입힌트 CAST 를 붙인다.
     */
    @Query("SELECT al FROM AuditLog al " +
           "WHERE (CAST(:userIdx AS long) IS NULL OR al.userIdx = :userIdx) " +
           "AND (CAST(:targetType AS string) IS NULL OR al.targetType = :targetType) " +
           "AND (CAST(:action AS string) IS NULL OR al.action = :action) " +
           "AND (CAST(:documentIdx AS long) IS NULL OR al.documentIdx = :documentIdx) " +
           "AND (CAST(:start AS timestamp) IS NULL OR al.createdAt >= :start) " +
           "AND (CAST(:end AS timestamp) IS NULL OR al.createdAt < :end) " +
           "ORDER BY al.createdAt DESC")
    Page<AuditLog> search(@Param("userIdx") Long userIdx,
                           @Param("targetType") String targetType,
                           @Param("action") String action,
                           @Param("documentIdx") Long documentIdx,
                           @Param("start") LocalDateTime start,
                           @Param("end") LocalDateTime end,
                           Pageable pageable);
}
