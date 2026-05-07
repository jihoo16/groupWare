package com.pinecni.erp.api.notification.repository;

import com.pinecni.erp.entity.NotificationSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, Long> {

    List<NotificationSubscription> findByUserIdx(Long userIdx);

    Optional<NotificationSubscription> findByUserIdxAndNotificationTypeAndChannel(
            Long userIdx, String notificationType, String channel);
}
