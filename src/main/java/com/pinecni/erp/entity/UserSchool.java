package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_school",
    schema = "erp",
    indexes = {
        @Index(name = "idx_user_school_user_idx",   columnList = "user_idx"),
        @Index(name = "idx_user_school_is_deleted",  columnList = "is_deleted")
    }
)
@SQLRestriction("is_deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserSchool extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_school_sequence")
    @SequenceGenerator(name = "user_school_sequence", sequenceName = "erp.user_school_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "user_idx", nullable = false)
    private Long userIdx;

    @Column(name = "school_name", nullable = false, length = 200)
    private String schoolName;

    @Column(name = "major_name", length = 200)
    private String majorName;

    // HIGH_SCHOOL / ASSOCIATE / BACHELOR / MASTER / DOCTOR
    @Column(name = "degree_type", length = 50)
    private String degreeType;

    @Column(name = "graduation_date")
    private LocalDate graduationDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /** 이공계 학위 여부 (체크박스, 본인 판단) */
    @Builder.Default
    @Column(name = "is_stem_major", nullable = false)
    private Boolean isStemMajor = false;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;
}
