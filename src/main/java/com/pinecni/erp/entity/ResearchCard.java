package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 연구비 카드 Entity
 */
@Entity
@Table(name = "research_cards", schema = "erp", indexes = {
        @Index(name = "idx_rc_project", columnList = "project_idx"),
        @Index(name = "idx_rc_company", columnList = "card_company"),
        @Index(name = "idx_rc_digits", columnList = "card_last_digits")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResearchCard extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "research_cards_sequence")
    @SequenceGenerator(name = "research_cards_sequence", sequenceName = "erp.research_cards_sequence", allocationSize = 1)
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
