package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 코드 그룹 Entity
 */
@Entity
@Table(name = "code_group", schema = "erp", indexes = {
        @Index(name = "idx_code_group_use_yn", columnList = "use_yn"),
        @Index(name = "idx_code_group_sort", columnList = "sort_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodeGroup extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "code_group_sequence")
    @SequenceGenerator(name = "code_group_sequence", sequenceName = "erp.code_group_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "group_code", nullable = false, unique = true, length = 50)
    private String groupCode;

    @Column(name = "group_name", nullable = false, length = 100)
    private String groupName;

    @Column(name = "group_name_en", length = 100)
    private String groupNameEn;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "use_yn", nullable = false, length = 1)
    private String useYn = "Y";

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
