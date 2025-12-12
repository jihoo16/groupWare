package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;


@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "meeting_minutes", schema = "erp")
public class MeetingsMinutes {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "project_idx")
    private Long projectIdx;

    @Size(max = 200)
    @Column(name = "project_name", length = 200)
    private String projectName;

    @Size(max = 300)
    @NotNull
    @Column(name = "meeting_title", nullable = false, length = 300)
    private String meetingTitle;

    @Column(name = "meeting_datetime")
    private Instant meetingDatetime;

    @Size(max = 200)
    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "participants", length = Integer.MAX_VALUE)
    private String participants;

    @Column(name = "purpose", length = Integer.MAX_VALUE)
    private String purpose;

    @Column(name = "content", length = Integer.MAX_VALUE)
    private String content;

    @Column(name = "decisions", length = Integer.MAX_VALUE)
    private String decisions;

    @Column(name = "action_items", length = Integer.MAX_VALUE)
    private String actionItems;

    @Column(name = "created_user_idx")
    private Long createdUserIdx;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_user_idx")
    private Long updatedUserIdx;

    @NotNull
    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

}