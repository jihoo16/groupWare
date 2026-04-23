package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * 문서별 서명 기록 Entity
 * - 결재선 각 위치의 서명 상태·이미지 관리
 * - 순차 서명 (signature_order) + 연동 서명 (linked_signature_idx) 지원
 * - 같은 사람이 다른 slot으로 복수 행 가능 (예: ATTENDEE + PROJECT_LEAD)
 */
@Entity
@Table(name = "document_signatures", schema = "erp", indexes = {
        @Index(name = "idx_ds_document", columnList = "document_idx"),
        @Index(name = "idx_ds_order", columnList = "document_idx, signature_order"),
        @Index(name = "idx_ds_signer", columnList = "signer_user_idx, status"),
        @Index(name = "idx_ds_status", columnList = "status"),
        @Index(name = "idx_ds_linked", columnList = "linked_signature_idx")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_ds_document_slot",
                columnNames = {"document_idx", "signer_user_idx", "signature_slot"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DocumentSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "document_signatures_sequence")
    @SequenceGenerator(name = "document_signatures_sequence",
            sequenceName = "erp.document_signatures_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 대상 문서 IDX */
    @Column(name = "document_idx", nullable = false)
    private Long documentIdx;

    /**
     * 서명자 IDX (polymorphic)
     * - isExternal = false: users.idx
     * - isExternal = true : external_person.idx
     * FK 제약 없음 (receipt_attendee.user_idx와 동일 패턴)
     */
    @Column(name = "signer_user_idx", nullable = false)
    private Long signerUserIdx;

    /** 외부인 서명 여부 (true이면 signer_user_idx는 external_person.idx) */
    @Column(name = "is_external", nullable = false)
    @Builder.Default
    private Boolean isExternal = false;

    /** 서명 위치 (code_group C16) */
    @Column(name = "signature_slot", nullable = false, length = 10)
    private String signatureSlot;

    /** 서명 단계 순번 */
    @Column(name = "signature_order", nullable = false)
    @Builder.Default
    private Integer signatureOrder = 1;

    /**
     * 연동 서명 IDX (자기참조 FK)
     * - 이 행이 서명되면 linked된 하위 행도 자동 완료
     * - 같은 사람이 복수 슬롯일 때 상위 order 행의 idx를 가리킴
     */
    @Column(name = "linked_signature_idx")
    private Long linkedSignatureIdx;

    /** 서명 상태 (code_group C14) */
    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private String status = "C1401";

    /** 손서명 이미지 (PNG, bytea) */
    @Column(name = "signature_image", columnDefinition = "bytea")
    private byte[] signatureImage;

    /** 서명 이미지 파일 경로 (대용량 대비 파일 저장 시) */
    @Column(name = "signature_image_path", length = 500)
    private String signatureImagePath;

    /** 서명 요청 시각 (NULL이면 차례 아님) */
    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    /** 서명 완료 시각 */
    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    /** 서명에 사용된 QR 세션 IDX */
    @Column(name = "signature_session_idx")
    private Long signatureSessionIdx;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
