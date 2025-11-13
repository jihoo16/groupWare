package com.pinecni.erp.api.department.repository;

import com.pinecni.erp.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Department Repository
 */
@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    /**
     * 부서 코드로 조회
     */
    Optional<Department> findByDeptCode(String deptCode);

    /**
     * 부서명으로 조회
     */
    Optional<Department> findByDeptName(String deptName);

    /**
     * 활성화된 부서 목록 조회 (idx DESC)
     */
    @Query("SELECT d FROM Department d WHERE d.useYn = 'Y' AND d.deletedAt IS NULL ORDER BY d.idx DESC")
    List<Department> findAllActive();

    /**
     * 부서 유형별 조회 (idx DESC)
     */
    @Query("SELECT d FROM Department d WHERE d.deptType = :deptType AND d.useYn = 'Y' AND d.deletedAt IS NULL ORDER BY d.idx DESC")
    List<Department> findByDeptType(String deptType);

    /**
     * 상위 부서 코드로 하위 부서 조회 (idx DESC)
     */
    @Query("SELECT d FROM Department d WHERE d.parentDeptCode = :parentDeptCode AND d.useYn = 'Y' AND d.deletedAt IS NULL ORDER BY d.idx DESC")
    List<Department> findByParentDeptCode(String parentDeptCode);

    /**
     * 사용 여부별 조회 (idx DESC)
     */
    @Query("SELECT d FROM Department d WHERE d.useYn = :useYn AND d.deletedAt IS NULL ORDER BY d.idx DESC")
    List<Department> findByUseYn(String useYn);
}
