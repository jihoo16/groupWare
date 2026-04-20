package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * 서명 요청 Entity
 * - 서명 대상자별 처리 현황 관리 (홈 화면 알림 + 미처리 목록용)
 * - document_signatures 행 생성 시 함께 생성
 */
@Entity
@Table(name = "signature_requests", schema = "erp", indexes = {
        @Index(name = "idx_sr_document", columnList = "document_idx")
        // idx_sr_signer_pending은 partial index라 JPA 어노테이션으로 표현 불가, DDL로 생성됨
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SignatureRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "signature_requests_sequence")
    @SequenceGenerator(name = "signature_requests_sequence",
            sequenceName = "erp.signature_requests_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 대상 문서 IDX */
    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

    /** 서명 기록 IDX (document_signatures.idx FK) */
    @Column(name = "document_signature_idx", nullable = false)
    private Long documentSignatureIdx;

    /**
     * 서명 요청자 IDX
     * - 실제 문서를 생성한 로그인 사용자 (approval_documents.created_user_idx)
     * - 대리 작성 시 문서상 작성자(drafter_user_idx)와 다를 수 있음
     */
    @Column(name = "requester_user_idx", nullable = false)
    private Long requesterUserIdx;

    /** 서명 대상자 IDX */
    @Column(name = "signer_user_idx", nullable = false)
    private Long signerUserIdx;

    /** 처리 완료 여부 */
    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private Boolean isCompleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 처리 완료 시각 */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
