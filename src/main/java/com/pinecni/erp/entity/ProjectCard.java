package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 연구비카드 Entity
 */
@Entity
@Table(name = "project_cards", schema = "erp", indexes = {
        @Index(name = "idx_pc_project", columnList = "project_idx"),
        @Index(name = "idx_pc_company", columnList = "card_company"),
        @Index(name = "idx_pc_digits", columnList = "card_last_digits")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProjectCard extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_cards_sequence")
    @SequenceGenerator(name = "project_cards_sequence", sequenceName = "erp.project_cards_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "card_company", nullable = false, length = 50)
    private String cardCompany;

    @Column(name = "card_last_digits", nullable = false, length = 4)
    private String cardLastDigits;

    @Column(name = "card_nickname", length = 100)
    private String cardNickname;

    @Column(name = "is_active")
    private Boolean isActive = true;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;
}
