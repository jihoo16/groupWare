package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 사용자별 Mattermost 식별자 캐시.
 *
 * <p>사번 = MM username 이라 매핑 자체는 자동이지만, 발송에 필요한
 * 내부 user.id 와 DM 채널 ID 는 첫 발송 시 한 번 받아와 여기 저장.
 */
@Entity
@Table(name = "notification_user_links", schema = "erp",
        uniqueConstraints = @UniqueConstraint(name = "uq_nul_user", columnNames = "user_idx"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationUserLink {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "notification_user_links_seq")
    @SequenceGenerator(name = "notification_user_links_seq",
            sequenceName = "erp.notification_user_links_sequence",
            allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    /** MM 미가입/봇차단 시 NULL + isActive=false + lastError 에 사유 */
    @Column(name = "mm_user_id", length = 50)
    private String mmUserId;

    @Column(name = "mm_dm_channel_id", length = 50)
    private String mmDmChannelId;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "cached_at", nullable = false)
    private LocalDateTime cachedAt;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;
}
