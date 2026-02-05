package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 프로젝트별 회의록 기본 정보 Entity
 */
@Entity
@Table(name = "receipt_meeting", schema = "erp", indexes = {
        @Index(name = "idx_receipt_meeting_project", columnList = "project_idx"),
        @Index(name = "idx_receipt_meeting_card", columnList = "card_idx"),
        @Index(name = "idx_receipt_meeting_author", columnList = "author_idx"),
        @Index(name = "idx_receipt_meeting_status", columnList = "status"),
        @Index(name = "idx_receipt_meeting_date", columnList = "meeting_date")
})
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "receipt_meeting_sequence")
    @SequenceGenerator(name = "receipt_meeting_sequence", sequenceName = "erp.receipt_meeting_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "card_idx")
    private Long cardIdx;

    @Column(name = "document_idx")
    private Long documentIdx;

    @Column(name = "author_idx", nullable = false)
    private Long authorIdx;

    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "location", nullable = false, length = 200)
    private String location;

    @Column(name = "amount", precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_idx", insertable = false, updatable = false)
    private ProjectCard projectCard;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_idx", insertable = false, updatable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_idx", insertable = false, updatable = false)
    private ApprovalDocument approvalDocument;

    /**
     * 참석자 목록 (통합 테이블 사용)
     * - JPA 관계 매핑 제거 (통합 테이블로 인해 복잡도 증가)
     * - Repository를 통해 직접 조회 후 설정 필요
     */
    @Transient
    private List<ReceiptAttendee> attendees = new ArrayList<>();

    @OneToMany(mappedBy = "receiptMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReceiptMeetingAttachment> attachments = new ArrayList<>();

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
