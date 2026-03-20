package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 연구비증빙 출장+회의 통합 Entity
 * - 출장 정보 (trip_date, duration, total_fee 등) 만 보유
 * - 회의 정보는 receipt_trip_meeting_session (1:N) 에 별도 저장
 * - 비용 상세는 receipt_trip_meeting_daily_expense (1:N) 에 저장, total_fee 는 SUM 캐시
 */
@Entity
@Table(name = "receipt_trip_meeting", schema = "erp", indexes = {
        @Index(name = "idx_receipt_trip_meeting_project",  columnList = "project_idx"),
        @Index(name = "idx_receipt_trip_meeting_card",     columnList = "card_idx"),
        @Index(name = "idx_receipt_trip_meeting_drafter",  columnList = "drafter_user_idx"),
        @Index(name = "idx_receipt_trip_meeting_trip_date",columnList = "trip_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptTripMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_trip_meeting_seq")
    @SequenceGenerator(name = "receipt_trip_meeting_seq",
                       sequenceName = "erp.receipt_trip_meeting_sequence",
                       allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    @Column(name = "document_idx")
    private Long documentIdx;

    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(name = "drafter_user_idx", nullable = false)
    private Long drafterUserIdx;

    // ─── 출장 필드 ───────────────────────────────────────────────────

    /** 출장 시작일 */
    @Column(name = "trip_date")
    private LocalDate tripDate;

    /** 품의서 날짜 (출장 예매 기준일, nullable) */
    @Column(name = "requisition_date")
    private LocalDate requisitionDate;

    /** 출장 박 수 (0 = 당일) */
    @Column(name = "duration", nullable = false)
    private Integer duration = 0;

    /** 총 경비 합계 (일별명세 전 항목 합산 SUM 캐시) */
    @Column(name = "total_fee", precision = 15, scale = 2)
    private BigDecimal totalFee;

    // ─── 공통 필드 ───────────────────────────────────────────────────

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    /** 출장 내용 및 결과 */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    // ─── 관계 매핑 ──────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_idx", insertable = false, updatable = false)
    private ProjectCard projectCard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    @OneToMany(mappedBy = "receiptTripMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReceiptTripMeetingDailyExpense> dailyExpenses = new ArrayList<>();

    @OneToMany(mappedBy = "receiptTripMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReceiptTripMeetingAttachment> attachments = new ArrayList<>();

    /** 참석자 목록 - receipt_attendee 통합 테이블 (prefix=RCTM), 서비스 계층에서 별도 조회 후 주입 */
    @Transient
    @Builder.Default
    private List<ReceiptAttendee> attendees = new ArrayList<>();

    // ─── 소프트 딜리트 ───────────────────────────────────────────────

    @Builder.Default
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
