package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * 감사 로그 Entity
 * - 시스템 전체 행위 이력 (append-only)
 * - 사번/이름은 저장하지 않고 users JOIN으로 조회
 * - 모든 로그에 user_idx + ip_address 필수
 */
@Entity
@Table(name = "audit_logs", schema = "erp", indexes = {
        @Index(name = "idx_al_user", columnList = "user_idx, created_at DESC"),
        @Index(name = "idx_al_document", columnList = "document_idx, created_at DESC"),
        @Index(name = "idx_al_target", columnList = "target_type, target_idx"),
        @Index(name = "idx_al_action", columnList = "action, created_at DESC"),
        @Index(name = "idx_al_ip", columnList = "ip_address, created_at DESC"),
        @Index(name = "idx_al_created", columnList = "created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "audit_logs_sequence")
    @SequenceGenerator(name = "audit_logs_sequence",
            sequenceName = "erp.audit_logs_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 행위자 IDX (users.idx FK) - 사번·이름은 JOIN으로 조회 */
    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    /** 대상 유형 (code_group C17) */
    @Column(name = "target_type", nullable = false, length = 10)
    private String targetType;

    /** 대상 IDX (해당 테이블의 PK) */
    @Column(name = "target_idx")
    private Long targetIdx;

    /** 관련 문서 IDX (문서별 이력 빠른 조회용) */
    @Column(name = "document_idx")
    private Long documentIdx;

    /** 행위 유형 (code_group C18) */
    @Column(name = "action", nullable = false, length = 10)
    private String action;

    /** 사람이 읽을 수 있는 행위 설명 */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * 상세 데이터 (JSONB) - 변경 전/후 값 등
     * 예: {"before": {"status": "C1401"}, "after": {"status": "C1402"}}
     * 주의: Hibernate 6+ 기본 JSON 지원으로 String 사용. 실제 저장 시 JSONB로 변환됨.
     */
    @Column(name = "detail_json", columnDefinition = "jsonb")
    private String detailJson;

    /** 클라이언트 IP (IPv4/IPv6) */
    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;

    /** User-Agent */
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    /** 요청 URL */
    @Column(name = "request_url", length = 500)
    private String requestUrl;

    /** HTTP 메서드 */
    @Column(name = "request_method", length = 10)
    private String requestMethod;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
