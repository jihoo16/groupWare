package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 통합 참석자 Entity
 * - 회의록, 야근식대 등 모든 문서의 참석자를 통합 관리
 */
@Entity
@Table(name = "receipt_attendee", schema = "erp", indexes = {
        // 단일 컬럼 인덱스
        @Index(name = "idx_ra_receipt",       columnList = "receipt_idx"),
        @Index(name = "idx_ra_user",          columnList = "user_idx"),
        @Index(name = "idx_ra_project",       columnList = "project_idx"),
        @Index(name = "idx_ra_document_type", columnList = "document_type_prefix"),
        @Index(name = "idx_ra_document_date", columnList = "document_date"),
        @Index(name = "idx_ra_card",          columnList = "card_idx"),
        // 복합 인덱스: 교차 중복 검증 쿼리 전용
        // WHERE user_idx=? AND project_idx=? AND document_date=? AND is_deleted=false
        @Index(name = "idx_ra_dup_check",
               columnList = "user_idx, project_idx, document_date, is_deleted"),
        // 복합 인덱스: 문서별 참석자 조회 전용 (가장 빈번한 쿼리)
        // WHERE receipt_idx=? AND document_type_prefix=? AND is_deleted=false
        @Index(name = "idx_ra_receipt_type",
               columnList = "receipt_idx, document_type_prefix, is_deleted")
})
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_attendee_sequence")
    @SequenceGenerator(name = "receipt_attendee_sequence", sequenceName = "erp.receipt_attendee_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    /**
     * 문서 타입 구분 (document_sequences.prefix 값)
     * - RCM: 회의록 (Receipt Meeting)
     * - RCO: 야근 식대 (Receipt Overtime)
     * - RCT: 출장 (Receipt Trip)
     * - RCTM: 출장+회의 (Receipt Trip Meeting)
     */
    @Column(name = "document_type_prefix", nullable = false, length = 20)
    private String documentTypePrefix;

    /**
     * 원본 문서 idx
     * - RCM: receipt_meeting.idx
     * - RCO: receipt_overtime.idx
     * - RCT: receipt_trip.idx
     * - RCTM: receipt_trip_meeting.idx
     */
    @Column(name = "receipt_idx", nullable = false)
    private Long receiptIdx;

    @Column(name = "project_idx")
    private Long projectIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    /**
     * 참석자 IDX
     * - isExternal = false: users.idx
     * - isExternal = true: external_persons.idx
     * FK 제약조건 없음 (두 개의 다른 테이블 참조)
     */
    @Column(name = "user_idx")
    private Long userIdx;

    /**
     * 외부 참석자 여부
     * - true: 외부 인력 (user_idx는 external_persons.idx 참조)
     * - false: 내부 인력 (user_idx는 users.idx 참조)
     */
    @Builder.Default
    @Column(name = "is_external", nullable = false)
    private Boolean isExternal = false;

    /**
     * 문서 실행 날짜 (회의일, 야근일, 출장일 등)
     */
    @Column(name = "document_date")
    private LocalDate documentDate;

    /**
     * 시작 시간 (회의록 등에서 사용)
     */
    @Column(name = "start_time")
    private LocalTime startTime;

    /**
     * 종료 시간 (회의록 등에서 사용)
     */
    @Column(name = "end_time")
    private LocalTime endTime;

    @Builder.Default
    @Column(name = "display_order")
    private Integer displayOrder = 0;

    /**
     * 회의비 (회의록 전용, 참석자별 회의 비용)
     */
    @Builder.Default
    @Column(name = "meeting_expense")
    private Long meetingExpense = 0L;

    /**
     * 작업 내용 (야근 식대 전용)
     */
    @Column(name = "work_task", length = 500)
    private String workTask;

    /**
     * 참여 구분 (출장+회의(RCTM) 전용)
     * - '출장': RCTM 문서에서 출장 참석자
     * - '회의': RCTM 문서에서 회의 참석자
     * - null: 다른 문서 타입 (RCM, RCO, RCT)
     */
    @Column(name = "participation_type", length = 10)
    private String participationType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_user_idx", nullable = false)
    private Long createdUserIdx;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_idx", insertable = false, updatable = false)
    private ProjectCard projectCard;

    // user_idx는 FK 없이 직접 참조
    // - isExternal = false일 때: User 엔티티
    // - isExternal = true일 때: ExternalPerson 엔티티
    // 조회 시 isExternal 값에 따라 적절한 테이블 조인 필요

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
