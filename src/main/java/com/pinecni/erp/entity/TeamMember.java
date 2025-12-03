package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 팀 멤버 Entity
 */
@Entity
@Table(name = "team_member", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"team_idx", "member_idx"}),
        indexes = {
                @Index(name = "idx_tm_team", columnList = "team_idx"),
                @Index(name = "idx_tm_member", columnList = "member_idx"),
                @Index(name = "idx_tm_active", columnList = "is_active")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "team_member_sequence")
    @SequenceGenerator(name = "team_member_sequence", sequenceName = "erp.team_member_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "team_idx", nullable = false)
    private Long teamIdx;

    @Column(name = "member_idx", nullable = false)
    private Long memberIdx;

    @Column(name = "role", length = 50)
    private String role;

    @Column(name = "join_at")
    private LocalDateTime joinAt;

    @Column(name = "leave_at")
    private LocalDateTime leaveAt;

    @Column(name = "is_active", length = 1)
    private String isActive = "Y";

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_idx", insertable = false, updatable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_idx", insertable = false, updatable = false)
    private User member;
}
