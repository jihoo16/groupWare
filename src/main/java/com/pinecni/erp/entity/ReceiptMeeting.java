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
        @Index(name = "idx_receipt_meeting_date", columnList = "meeting_date"),
        @Index(name = "idx_receipt_meeting_document_number", columnList = "document_number")
})
@SQLRestriction("deleted = false")
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

    @Column(name = "document_number", unique = true, length = 50)
    private String documentNumber;

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

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "minutes_notes", columnDefinition = "TEXT")
    private String minutesNotes;

    @Column(name = "status", length = 20)
    private String status = "PENDING";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_idx", insertable = false, updatable = false)
    private User author;

    @OneToMany(mappedBy = "receiptMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReceiptMeetingAttendee> attendees = new ArrayList<>();

    @OneToMany(mappedBy = "receiptMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReceiptMeetingApproval> approvals = new ArrayList<>();

    @OneToMany(mappedBy = "receiptMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReceiptMeetingAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "receiptMeeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReceiptMeetingOfficialPdf> officialPdfs = new ArrayList<>();

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
