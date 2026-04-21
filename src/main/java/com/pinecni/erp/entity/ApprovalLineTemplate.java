package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * 결재라인 템플릿 Entity
 * - 문서유형별 기본 결재선 정의
 * - 문서 생성 시 이 템플릿 기반으로 document_signatures 자동 생성
 */
@Entity
@Table(name = "approval_line_templates", schema = "erp", indexes = {
        @Index(name = "idx_alt_type", columnList = "document_type, signature_order")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_alt_type_slot", columnNames = {"document_type", "signature_slot"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalLineTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "approval_line_templates_sequence")
    @SequenceGenerator(name = "approval_line_templates_sequence",
            sequenceName = "erp.approval_line_templates_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /** 문서유형 코드 (code_group C04) */
    @Column(name = "document_type", nullable = false, length = 10)
    private String documentType;

    /** 서명 위치 코드 (code_group C16) */
    @Column(name = "signature_slot", nullable = false, length = 10)
    private String signatureSlot;

    /** 서명 단계 순번 (같은 순번은 병렬 서명) */
    @Column(name = "signature_order", nullable = false)
    private Integer signatureOrder;

    /** 서명자 결정 방식: ATTENDEE / DRAFTER / PROJECT_LEAD / DEPT_HEAD */
    @Column(name = "signer_role", nullable = false, length = 30)
    private String signerRole;

    /** 문서에 표시되는 서명칸 라벨 */
    @Column(name = "slot_label", nullable = false, length = 30)
    private String slotLabel;

    /** 연동 서명 여부 (같은 사람 복수 슬롯 시 한 번에 처리) */
    @Column(name = "is_auto_linked", nullable = false)
    @Builder.Default
    private Boolean isAutoLinked = false;

    /** 활성 여부 */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
