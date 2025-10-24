package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 코드 Entity
 */
@Entity
@Table(name = "code", schema = "erp",
        uniqueConstraints = @UniqueConstraint(name = "uk_group_code", columnNames = {"group_code", "code"}),
        indexes = {
                @Index(name = "idx_code_group_code", columnList = "group_code"),
                @Index(name = "idx_code_use_yn", columnList = "use_yn"),
                @Index(name = "idx_code_group_code_sort", columnList = "group_code, sort_order")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Code extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "code_sequence")
    @SequenceGenerator(name = "code_sequence", sequenceName = "erp.code_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "group_code", nullable = false, length = 50)
    private String groupCode;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "code_name", nullable = false, length = 100)
    private String codeName;

    @Column(name = "code_name_en", length = 100)
    private String codeNameEn;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "use_yn", nullable = false, length = 1)
    private String useYn = "Y";

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    // 관계 매핑 (optional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_code", referencedColumnName = "group_code", insertable = false, updatable = false)
    private CodeGroup codeGroup;
}
