package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * 서명 세션 Entity
 * - QR 코드 기반 전자서명 세션 관리
 * - 상태: C1301(QR생성) → C1302(스캔완료) → C1303(본인인증완료) → C1304(서명완료)
 *         / C1305(만료) / C1306(취소)
 */
@Entity
@Table(name = "signature_sessions", schema = "erp", indexes = {
        @Index(name = "idx_ss_token", columnList = "session_token"),
        @Index(name = "idx_ss_document", columnList = "document_idx"),
        @Index(name = "idx_ss_signer", columnList = "signer_user_idx, status"),
        @Index(name = "idx_ss_expires", columnList = "expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SignatureSession {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "signature_sessions_sequence")
    @SequenceGenerator(name = "signature_sessions_sequence",
            sequenceName = "erp.signature_sessions_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** UUID 기반 고유 토큰 (QR에 인코딩) */
    @Column(name = "session_token", nullable = false, unique = true, length = 64)
    private String sessionToken;

    /** 대상 문서 IDX */
    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

    /** 서명 대상자 IDX */
    @Column(name = "signer_user_idx", nullable = false)
    private Long signerUserIdx;

    /** 세션 상태 (code_group C13) */
    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private String status = "C1301";

    /** 사번 2차 인증 실패 횟수 (5회 초과 시 EXPIRED) */
    @Column(name = "verify_fail_count", nullable = false)
    @Builder.Default
    private Integer verifyFailCount = 0;

    /** 사번 2차 인증 성공 시각 */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    /** 세션 만료 시각 */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** 모바일 QR 스캔 시각 */
    @Column(name = "scanned_at")
    private LocalDateTime scannedAt;

    /** 서명 완료 시각 */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /** 스캔 디바이스 IP (감사용) */
    @Column(name = "scanned_ip", length = 45)
    private String scannedIp;

    /** 스캔 디바이스 User-Agent (감사용) */
    @Column(name = "scanned_user_agent", columnDefinition = "TEXT")
    private String scannedUserAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 세션 생성자 IDX (서명칸 클릭한 사용자) */
    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
