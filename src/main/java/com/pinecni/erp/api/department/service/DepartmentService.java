package com.pinecni.erp.api.department.service;

import com.pinecni.erp.api.department.repository.DepartmentRepository;
import com.pinecni.erp.entity.Department;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Department Service
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    /**
     * 전체 활성 부서 목록 조회
     */
    public List<Department> getAllActiveDepartments() {
        log.debug("getAllActiveDepartments() called");
        return departmentRepository.findAllActive();
    }

    /**
     * 부서 코드로 조회
     */
    public Optional<Department> getDepartmentByCode(String deptCode) {
        log.debug("getDepartmentByCode() called with deptCode: {}", deptCode);
        return departmentRepository.findByDeptCode(deptCode);
    }

    /**
     * 부서명으로 조회
     */
    public Optional<Department> getDepartmentByName(String deptName) {
        log.debug("getDepartmentByName() called with deptName: {}", deptName);
        return departmentRepository.findByDeptName(deptName);
    }

    /**
     * 부서 유형별 조회
     */
    public List<Department> getDepartmentsByType(String deptType) {
        log.debug("getDepartmentsByType() called with deptType: {}", deptType);
        return departmentRepository.findByDeptType(deptType);
    }

    /**
     * 부서명으로 부서 코드 조회
     * user 생성/수정 시 부서명 → 부서코드 변환용
     */
    public String getDeptCodeByName(String deptName) {
        log.debug("getDeptCodeByName() called with deptName: {}", deptName);
        return departmentRepository.findByDeptName(deptName)
                .map(Department::getDeptCode)
                .orElse(null);
    }

    /**
     * 부서 코드 유효성 검증
     * 활성 상태이고 삭제되지 않은 부서만 유효함
     */
    public boolean isDeptCodeValid(String deptCode) {
        return departmentRepository.findByDeptCode(deptCode)
                .filter(dept -> "Y".equals(dept.getUseYn()))
                .filter(dept -> dept.getDeletedAt() == null)
                .isPresent();
    }

    /**
     * 부서 생성
     */
    @Transactional
    public Department createDepartment(Department department) {
        log.info("createDepartment() called with deptCode: {}", department.getDeptCode());

        // 부서 코드 중복 확인
        if (departmentRepository.findByDeptCode(department.getDeptCode()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 부서 코드입니다: " + department.getDeptCode());
        }

        // 기본값 설정
        if (department.getUseYn() == null || department.getUseYn().isEmpty()) {
            department.setUseYn("Y");
        }
        if (department.getSortOrder() == null) {
            department.setSortOrder(0);
        }

        return departmentRepository.save(department);
    }

    /**
     * 부서 수정
     */
    @Transactional
    public Department updateDepartment(Long idx, Department updatedDepartment) {
        log.info("updateDepartment() called with idx: {}", idx);

        Department department = departmentRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 부서입니다: " + idx));

        // 부서 정보 업데이트 (deptCode는 변경 불가)
        department.setDeptName(updatedDepartment.getDeptName());
        department.setDeptType(updatedDepartment.getDeptType());
        department.setParentDeptCode(updatedDepartment.getParentDeptCode());
        department.setSortOrder(updatedDepartment.getSortOrder());
        department.setDescription(updatedDepartment.getDescription());
        department.setUseYn(updatedDepartment.getUseYn());

        return departmentRepository.save(department);
    }

    /**
     * 부서 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteDepartment(Long idx, Long deletedUserIdx) {
        log.info("deleteDepartment() called with idx: {}", idx);

        Department department = departmentRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 부서입니다: " + idx));

        department.setDeletedAt(java.time.LocalDateTime.now());
        department.setDeletedUserIdx(deletedUserIdx);
        departmentRepository.save(department);

        log.info("Department soft deleted successfully. idx: {}, deptCode: {}", idx, department.getDeptCode());
    }
}
