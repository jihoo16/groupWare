package com.pinecni.erp.api.notification.repository;

import com.pinecni.erp.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** dedup_key 로 기존 행 조회 (멱등 INSERT 검사용) */
    Optional<Notification> findByDedupKey(String dedupKey);

    /**
     * 재시도 큐 폴링 — RETRY_WAIT(C2005) 인 행 중 다음 시도 시각이 도래한 것만.
     * 인덱스 idx_n_pending (status IN ('C2001','C2005') 부분 인덱스) 를 활용.
     */
    @Query("SELECT n FROM Notification n " +
           "WHERE n.status = 'C2005' " +
           "  AND n.nextAttemptAt IS NOT NULL " +
           "  AND n.nextAttemptAt <= :now " +
           "ORDER BY n.nextAttemptAt ASC")
    List<Notification> findRetryReady(@Param("now") LocalDateTime now);

    /**
     * TTL 만료 후보 — PENDING/RETRY_WAIT 인데 created_at 이 cutoff 이전.
     * cutoff = NOW - expire_after_minutes 분.
     */
    @Query("SELECT n FROM Notification n " +
           "WHERE n.status IN ('C2001', 'C2005') " +
           "  AND n.createdAt < :cutoff " +
           "ORDER BY n.createdAt ASC")
    List<Notification> findExpired(@Param("cutoff") LocalDateTime cutoff);

    /**
     * 같은 root 알림에 대해 이미 C1914 fallback 이 발행됐는지 검사.
     * (root 당 1건 한도 — cascade 차단)
     */
    @Query("SELECT (COUNT(n) > 0) FROM Notification n " +
           "WHERE n.notificationType = 'C1914' " +
           "  AND n.originalNotificationIdx = :rootIdx")
    boolean existsC1914FallbackForRoot(@Param("rootIdx") Long rootIdx);
}
