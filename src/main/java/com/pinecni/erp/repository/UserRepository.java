package com.pinecni.erp.repository;

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
     * 삭제되지 않은 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL")
    List<User> findAllActive();

    /**
     * 부서별 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.departmentCode = :departmentCode AND u.deletedAt IS NULL")
    List<User> findActiveByDepartmentCode(String departmentCode);

    /**
     * 직급별 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.positionCode = :positionCode AND u.deletedAt IS NULL")
    List<User> findActiveByPositionCode(String positionCode);

    /**
     * 이름 검색
     */
    @Query("SELECT u FROM User u WHERE u.name LIKE %:name% AND u.deletedAt IS NULL")
    List<User> searchByName(String name);
}
