package com.pinecni.erp.api.notification.repository;

import com.pinecni.erp.entity.NotificationUserLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationUserLinkRepository extends JpaRepository<NotificationUserLink, Long> {

    Optional<NotificationUserLink> findByUserIdx(Long userIdx);
}
