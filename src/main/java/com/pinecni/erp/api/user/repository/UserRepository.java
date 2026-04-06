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
     * 사번으로 사용자 조회 (삭제된 사용자 포함)
     */
    Optional<User> findByEmpId(String empId);

    /**
     * 이메일로 사용자 조회 (삭제된 사용자 포함)
     */
    Optional<User> findByEmpEmail(String empEmail);

    /**
     * 사번으로 활성 사용자 조회 (삭제된 사용자 제외)
     */
    @Query("SELECT u FROM User u WHERE u.empId = :empId AND u.deletedAt IS NULL")
    Optional<User> findActiveByEmpId(String empId);

    /**
     * 이메일로 활성 사용자 조회 (삭제된 사용자 제외)
     */
    @Query("SELECT u FROM User u WHERE u.empEmail = :empEmail AND u.deletedAt IS NULL")
    Optional<User> findActiveByEmpEmail(String empEmail);

    /**
     * 삭제되지 않은 사용자 조회 (개발자 계정 제외, 사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findAllActive();

    /**
     * 전체 사용자 조회 (삭제 포함, 개발자 계정 제외, 사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findAllNonDev();

    /**
     * 부서별 활성 사용자 조회 (개발자 계정 제외, 사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empDept = :empDept AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findActiveByEmpDept(String empDept);

    /**
     * 직급별 활성 사용자 조회 (개발자 계정 제외, 사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empPosition = :empPosition AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findActiveByEmpPosition(String empPosition);

    /**
     * 고위 관리자급 활성 사용자 조회 (대표이사/상무/이사, 개발자 계정 제외)
     * 프로젝트 연구책임자 선택 시 사용
     * sortOrder <= 3인 직급만 조회
     */
    @Query("SELECT u FROM User u JOIN Code c ON c.groupCode = 'C02' AND c.code = u.empPosition " +
           "WHERE u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' AND c.sortOrder <= 3 ORDER BY c.sortOrder ASC, u.empId ASC")
    List<User> findActiveHighRankManagers();

    /**
     * 상태별 사용자 조회 (개발자 계정 제외, 사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empStatus = :empStatus AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findByEmpStatus(String empStatus);

    /**
     * 이름 검색 (개발자 계정 제외, 사번 오름차순)
     */
    @Query("SELECT u FROM User u WHERE u.empName LIKE %:name% AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> searchByName(String name);

    /**
     * 이름으로 활성 사용자 조회 (정확히 일치, 개발자 계정 제외)
     */
    @Query("SELECT u FROM User u WHERE u.empName = :empName AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101'")
    List<User> findByEmpNameAndDeletedAtIsNull(String empName);

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
     * 팀장 여부로 활성 사용자 조회 (개발자 계정 제외)
     */
    @Query("SELECT u FROM User u WHERE u.isTeamLeader = :isTeamLeader AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findActiveByIsTeamLeader(Boolean isTeamLeader);

    /**
     * 상위보고자별 활성 사용자 조회 (개발자 계정 제외)
     */
    @Query("SELECT u FROM User u WHERE u.managerIdx = :managerIdx AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' ORDER BY u.empId ASC")
    List<User> findActiveByManagerIdx(Long managerIdx);

    /**
     * 보고체계 미설정 활성 사용자 수 조회 (대표이사·개발자 계정 제외)
     */
    @Query("SELECT COUNT(u) FROM User u JOIN Code c ON c.groupCode = 'C02' AND c.code = u.empPosition " +
           "WHERE u.managerIdx IS NULL AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' AND c.sortOrder > 1")
    Long countIncompleteHierarchy();

    /**
     * 보고체계 설정 완료 활성 사용자 수 조회 (대표이사·개발자 계정 제외)
     */
    @Query("SELECT COUNT(u) FROM User u JOIN Code c ON c.groupCode = 'C02' AND c.code = u.empPosition " +
           "WHERE u.managerIdx IS NOT NULL AND u.deletedAt IS NULL AND u.userRoleCode <> 'C1101' AND c.sortOrder > 1")
    Long countCompletedHierarchy();

    /**
     * 부서와 직급으로 활성 사용자 조회 (결재라인 자동 설정용)
     * 특정 부서의 상무(또는 특정 직급) 조회
     */
    @Query("SELECT u FROM User u WHERE u.empDept = :empDept AND u.empPosition = :empPosition AND u.deletedAt IS NULL")
    Optional<User> findActiveByEmpDeptAndEmpPosition(String empDept, String empPosition);

}
