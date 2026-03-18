package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_training",
    schema = "erp",
    indexes = {
        @Index(name = "idx_user_training_user_idx",   columnList = "user_idx"),
        @Index(name = "idx_user_training_is_deleted",  columnList = "is_deleted")
    }
)
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserTraining extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_training_sequence")
    @SequenceGenerator(name = "user_training_sequence", sequenceName = "erp.user_training_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "training_name", nullable = false, length = 200)
    private String trainingName;

    @Column(name = "training_org_name", nullable = false, length = 200)
    private String trainingOrgName;

    @Column(name = "completion_date", nullable = false)
    private LocalDate completionDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;
}
