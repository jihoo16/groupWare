package com.pinecni.erp.api.notification.repository;

import com.pinecni.erp.entity.NotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Mattermost 알림 시스템 설정 Repository.
 * 행은 항상 1개 (idx=1, DDL CHECK 제약).
 */
@Repository
public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, Long> {
}
