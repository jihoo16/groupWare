package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 외부인원 관리 Entity
 */
@Entity
@Table(name = "external_person", schema = "erp",
        indexes = {
                @Index(name = "idx_external_person_company", columnList = "company_name"),
                @Index(name = "idx_external_person_name", columnList = "name")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalPerson extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "external_person_sequence")
    @SequenceGenerator(name = "external_person_sequence", sequenceName = "erp.external_person_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "position", nullable = false, length = 100)
    private String position;

    @Column(name = "name", nullable = false, length = 100)
    private String name;
}
