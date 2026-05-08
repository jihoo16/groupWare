package com.pinecni.erp.api.notification.repository;

import com.pinecni.erp.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    // =========================================================================
    // 사용자 인박스 (INWEB 채널 — C2103)
    // =========================================================================

    /**
     * 본인 INWEB 알림 목록. unreadOnly=true 면 read_at IS NULL 만, type 지정되면 해당 종류만.
     * 정렬: 안 읽은 것 먼저, 그 다음 createdAt DESC.
     */
    @Query("SELECT n FROM Notification n " +
           "WHERE n.recipientUserIdx = :userIdx " +
           "  AND n.channel = 'C2103' " +
           "  AND (:unreadOnly = false OR n.readAt IS NULL) " +
           "  AND (:type IS NULL OR n.notificationType = :type) " +
           "ORDER BY (CASE WHEN n.readAt IS NULL THEN 0 ELSE 1 END), n.createdAt DESC")
    Page<Notification> findInboxPage(@Param("userIdx") Long userIdx,
                                     @Param("unreadOnly") boolean unreadOnly,
                                     @Param("type") String type,
                                     Pageable pageable);

    /** 안 읽은 INWEB 알림 카운트 (사이드바 배지용) */
    @Query("SELECT COUNT(n) FROM Notification n " +
           "WHERE n.recipientUserIdx = :userIdx " +
           "  AND n.channel = 'C2103' " +
           "  AND n.readAt IS NULL")
    long countUnreadInbox(@Param("userIdx") Long userIdx);

    /** 본인 INWEB 알림 모두 읽음 처리 (배치 UPDATE) */
    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now, n.updatedAt = :now, n.updatedUserIdx = :userIdx " +
           "WHERE n.recipientUserIdx = :userIdx " +
           "  AND n.channel = 'C2103' " +
           "  AND n.readAt IS NULL")
    int markAllInboxRead(@Param("userIdx") Long userIdx, @Param("now") LocalDateTime now);

    /** 본인의 특정 종류 안 읽은 인박스 알림 전체 (자동 읽음 동기화용) */
    @Query("SELECT n FROM Notification n " +
           "WHERE n.recipientUserIdx = :userIdx " +
           "  AND n.channel = 'C2103' " +
           "  AND n.notificationType = :type " +
           "  AND n.readAt IS NULL")
    List<Notification> findUnreadInboxByType(@Param("userIdx") Long userIdx,
                                              @Param("type") String type);

    /** root 에 매달린 알림 행 카운트 (특정 종류 제외) — 사용자 수동 재시도 한도 검사용 */
    @Query("SELECT COUNT(n) FROM Notification n " +
           "WHERE n.originalNotificationIdx = :rootIdx " +
           "  AND n.notificationType <> :excludedType")
    long countByOriginalNotificationIdxAndNotificationTypeNot(@Param("rootIdx") Long rootIdx,
                                                              @Param("excludedType") String excludedType);

    // =========================================================================
    // 관리자 발송 이력
    // =========================================================================

    /**
     * 발송 이력 페이지 조회. 모든 필터 인자는 null 허용.
     * 키워드는 last_error / dedup_key 안에서 ILIKE 매칭.
     */
    @Query("SELECT n FROM Notification n " +
           "WHERE (:type IS NULL OR n.notificationType = :type) " +
           "  AND (:status IS NULL OR n.status = :status) " +
           "  AND (:fromDt IS NULL OR n.createdAt >= :fromDt) " +
           "  AND (:toDt IS NULL OR n.createdAt < :toDt) " +
           "  AND (:keyword IS NULL OR LOWER(n.lastError) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "                       OR LOWER(n.dedupKey)  LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY n.createdAt DESC, n.idx DESC")
    Page<Notification> findAdminLogPage(@Param("type")    String type,
                                        @Param("status")  String status,
                                        @Param("fromDt")  LocalDateTime fromDt,
                                        @Param("toDt")    LocalDateTime toDt,
                                        @Param("keyword") String keyword,
                                        Pageable pageable);

    // =========================================================================
    // 본인이 발송 (= actor) 한 알림
    // =========================================================================

    /**
     * 내가 일으킨 알림 목록. C1914(내 알림이 실패해서 나에게 온 fallback) 는 받은 알림 쪽에 떠야 자연스러우므로
     * 보낸 목록에서는 제외. 채널 필터는 비어있으면 모든 채널.
     */
    @Query("SELECT n FROM Notification n " +
           "WHERE n.actorUserIdx = :userIdx " +
           "  AND n.notificationType <> 'C1914' " +
           "  AND (:channel IS NULL OR n.channel = :channel) " +
           "  AND (:type IS NULL OR n.notificationType = :type) " +
           "  AND (:status IS NULL OR n.status = :status) " +
           "ORDER BY n.createdAt DESC, n.idx DESC")
    Page<Notification> findSentPage(@Param("userIdx") Long userIdx,
                                    @Param("channel") String channel,
                                    @Param("type") String type,
                                    @Param("status") String status,
                                    Pageable pageable);

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
