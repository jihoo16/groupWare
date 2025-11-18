package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 팀 기본 정보 Entity
 */
@Entity
@Table(name = "team", schema = "erp",
        indexes = {
                @Index(name = "idx_team_creator", columnList = "created_user_idx"),
                @Index(name = "idx_team_leader", columnList = "team_leader_idx"),
                @Index(name = "idx_team_active", columnList = "is_active"),
                @Index(name = "idx_team_type", columnList = "team_type")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Team extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "team_sequence")
    @SequenceGenerator(name = "team_sequence", sequenceName = "erp.team_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "team_name", nullable = false, length = 100)
    private String teamName;

    @Column(name = "team_description", columnDefinition = "TEXT")
    private String teamDescription;

    @Column(name = "team_type", length = 20)
    private String teamType = "custom"; // custom / project / temporary

    @Column(name = "team_leader_idx")
    private Long teamLeaderIdx;

    @Column(name = "is_active", length = 1)
    private String isActive = "Y";

    // 관계 매핑
    // created_user_idx는 BaseEntity의 createdUserIdx 사용
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_idx", insertable = false, updatable = false)
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_leader_idx", insertable = false, updatable = false)
    private User teamLeader;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TeamMember> members = new ArrayList<>();
}
