package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 알림 종류별 (C19) 메시지 템플릿. 종류당 1행 (UNIQUE).
 *
 * <p>Thymeleaf TEXT 모드로 렌더링되며 {@code [[${변수명}]]} 자리표시자가
 * 발송 시점에 실제 값으로 치환됨.
 */
@Entity
@Table(name = "notification_templates", schema = "erp",
        uniqueConstraints = @UniqueConstraint(name = "uq_nt_type", columnNames = "notification_type"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "notification_templates_seq")
    @SequenceGenerator(name = "notification_templates_seq",
            sequenceName = "erp.notification_templates_sequence",
            allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** C19 알림유형 코드 (예: C1901 서명요청) */
    @Column(name = "notification_type", nullable = false, length = 10)
    private String notificationType;

    @Column(name = "title_template", nullable = false, length = 200)
    private String titleTemplate;

    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "link_template", length = 500)
    private String linkTemplate;

    /** Mattermost 메시지 좌측 컬러바 (#RRGGBB) */
    @Column(name = "color", length = 10)
    private String color;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;
}
