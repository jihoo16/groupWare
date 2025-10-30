package com.pinecni.erp.api.user.repository;

import com.pinecni.erp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * User Repository
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 사번으로 사용자 조회
     */
    Optional<User> findByEmpId(String empId);

    /**
     * 이메일로 사용자 조회
     */
    Optional<User> findByEmpEmail(String empEmail);

    /**
     * 삭제되지 않은 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL")
    List<User> findAllActive();

    /**
     * 부서별 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.empDept = :empDept AND u.deletedAt IS NULL")
    List<User> findActiveByEmpDept(String empDept);

    /**
     * 직급별 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.empPosition = :empPosition AND u.deletedAt IS NULL")
    List<User> findActiveByEmpPosition(String empPosition);

    /**
     * 상태별 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.empStatus = :empStatus AND u.deletedAt IS NULL")
    List<User> findByEmpStatus(String empStatus);

    /**
     * 이름 검색
     */
    @Query("SELECT u FROM User u WHERE u.empName LIKE %:name% AND u.deletedAt IS NULL")
    List<User> searchByName(String name);
}
