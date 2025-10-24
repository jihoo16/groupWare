package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 문서 번호 시퀀스 Entity
 */
@Entity
@Table(name = "document_sequences", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"document_type", "year"}),
        indexes = {
                @Index(name = "idx_ds_type", columnList = "document_type"),
                @Index(name = "idx_ds_year", columnList = "year")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "document_sequences_sequence")
    @SequenceGenerator(name = "document_sequences_sequence", sequenceName = "erp.document_sequences_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "current_sequence", nullable = false)
    private Integer currentSequence = 0;

    @Column(name = "prefix", length = 20)
    private String prefix;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
