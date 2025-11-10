package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 부서 정보 Entity
 */
@Entity
@Table(name = "departments", schema = "erp",
        uniqueConstraints = @UniqueConstraint(name = "uk_dept_code", columnNames = "dept_code"),
        indexes = {
                @Index(name = "idx_departments_dept_code", columnList = "dept_code"),
                @Index(name = "idx_departments_dept_type", columnList = "dept_type"),
                @Index(name = "idx_departments_parent_dept_code", columnList = "parent_dept_code"),
                @Index(name = "idx_departments_use_yn", columnList = "use_yn"),
                @Index(name = "idx_departments_deleted_at", columnList = "deleted_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "departments_sequence")
    @SequenceGenerator(name = "departments_sequence", sequenceName = "erp.departments_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "dept_code", nullable = false, unique = true, length = 20)
    private String deptCode;

    @Column(name = "dept_name", nullable = false, length = 100)
    private String deptName;

    @Column(name = "dept_type", length = 50)
    private String deptType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dept_type", referencedColumnName = "code", insertable = false, updatable = false)
    private Code departmentType;

    @Column(name = "parent_dept_code", length = 20)
    private String parentDeptCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_dept_code", referencedColumnName = "dept_code", insertable = false, updatable = false)
    private Department parentDepartment;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "use_yn", nullable = false, length = 1)
    private String useYn = "Y";

    // Soft delete
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;
}
