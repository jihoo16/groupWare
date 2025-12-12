package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 사용자/직원 정보 Entity
 */
@Entity
@Table(name = "\"user\"", schema = "erp", indexes = {
        @Index(name = "idx_user_emp_id", columnList = "emp_id"),
        @Index(name = "idx_user_emp_email", columnList = "emp_email"),
        @Index(name = "idx_user_emp_dept", columnList = "emp_dept"),
        @Index(name = "idx_user_emp_position", columnList = "emp_position"),
        @Index(name = "idx_user_emp_status", columnList = "emp_status"),
        @Index(name = "idx_user_deleted_at", columnList = "deleted_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_sequence")
    @SequenceGenerator(name = "user_sequence", sequenceName = "erp.user_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "emp_id", nullable = false, unique = true, length = 20)
    private String empId;

    @Column(name = "emp_name", nullable = false, length = 50)
    private String empName;

    @Column(name = "emp_birth", nullable = false)
    private LocalDate empBirth;

    @Column(name = "emp_gender", nullable = false, length = 10)
    private String empGender;

    @Column(name = "emp_email", nullable = false, unique = true, length = 100)
    private String empEmail;

    @Column(name = "external_email", length = 100)
    private String externalEmail;

    @Column(name = "emp_phone", nullable = false, length = 20)
    private String empPhone;

    @Column(name = "emergency_contact", length = 20)
    private String emergencyContact;

    @Column(name = "emp_address", length = 255)
    private String empAddress;

    @Column(name = "emp_dept", nullable = false, length = 20)
    private String empDept; // FK to code.code (C01 group)

    @Column(name = "emp_position", nullable = false, length = 30)
    private String empPosition;

    @Column(name = "emp_join_date", nullable = false)
    private LocalDate empJoinDate;

    @Column(name = "emp_status", nullable = false, length = 20)
    private String empStatus = "재직";

    @Column(name = "emp_work_type", length = 20)
    private String empWorkType = "정규직";

    @Column(name = "emp_notes", columnDefinition = "TEXT")
    private String empNotes;

    /**
     * 비밀번호 해시값 (password + salt를 SHA-256 해시)
     * 실제 비밀번호는 저장하지 않음 (보안)
     */
    @Column(name = "password", nullable = true, length = 255)
    private String password;

    /**
     * Salt 값 (비밀번호 해시 생성 시 사용된 랜덤 값)
     * 로그인 검증 시 사용
     */
    @Column(name = "password_hash", nullable = true, length = 64)
    private String passwordHash;

    @Column(name = "profile_photo_path", length = 255)
    private String profilePhotoPath;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    @Column(name = "signature_image", columnDefinition = "bytea")
    private byte[] signatureImage;

    @Column(name = "last_login_date")
    private LocalDateTime lastLoginDate;

    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin = false;

    // Soft delete
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_user_idx")
    private Long deletedUserIdx;
}
