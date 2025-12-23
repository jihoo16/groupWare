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
     * 삭제되지 않은 사용자 조회 (사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findAllActive();

    /**
     * 부서별 활성 사용자 조회 (사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empDept = :empDept AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findActiveByEmpDept(String empDept);

    /**
     * 직급별 활성 사용자 조회 (사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empPosition = :empPosition AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findActiveByEmpPosition(String empPosition);

    /**
     * 상태별 사용자 조회 (사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empStatus = :empStatus AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findByEmpStatus(String empStatus);

    /**
     * 이름 검색 (사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empName LIKE %:name% AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> searchByName(String name);

    /**
     * 특정 날짜 패턴으로 시작하는 사번 목록 조회 (사번 오름차순)
     * 예: datePrefix = "20251201" → 2025년 12월 1일에 생성된 사번 조회
     */
    @Query("SELECT u.empId FROM User u WHERE u.empId LIKE CONCAT(:datePrefix, '%') ORDER BY u.empId ASC")
    List<String> findEmpIdsByDatePrefix(String datePrefix);

    // ========================================
    // 보고체계 관리 관련 메서드
    // ========================================

    /**
     * 팀장 여부로 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.isTeamLeader = :isTeamLeader AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findActiveByIsTeamLeader(Boolean isTeamLeader);

    /**
     * 조직 레벨별 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.organizationalLevel = :level AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findActiveByOrganizationalLevel(Integer level);

    /**
     * 상위보고자별 활성 사용자 조회
     */
    @Query("SELECT u FROM User u WHERE u.managerIdx = :managerIdx AND u.deletedAt IS NULL ORDER BY u.empId ASC")
    List<User> findActiveByManagerIdx(Long managerIdx);

    /**
     * 보고체계 미설정 활성 사용자 수 조회
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.managerIdx IS NULL AND u.deletedAt IS NULL")
    Long countIncompleteHierarchy();

    /**
     * 보고체계 설정 완료 활성 사용자 수 조회
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.managerIdx IS NOT NULL AND u.deletedAt IS NULL")
    Long countCompletedHierarchy();
}
