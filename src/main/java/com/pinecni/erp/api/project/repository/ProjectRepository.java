package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Project Repository
 */
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    /**
     * 프로젝트명으로 조회
     */
    List<Project> findByProjectName(String projectName);

    /**
     * 상태별 프로젝트 조회
     */
    @Query("SELECT p FROM Project p WHERE p.projectStatus = :status AND p.isDeleted = false " +
            "ORDER BY p.startDate DESC")
    List<Project> findByProjectStatus(String status);

    /**
     * 활성 프로젝트 조회 (삭제되지 않은)
     */
    @Query("SELECT p FROM Project p WHERE p.isDeleted = false ORDER BY p.startDate DESC")
    List<Project> findAllActive();

    /**
     * 프로젝트명 검색
     */
    @Query("SELECT p FROM Project p WHERE p.projectName LIKE %:name% AND p.isDeleted = false")
    List<Project> searchByName(String name);

    /**
     * 기간별 진행 중인 프로젝트 조회
     */
    @Query("SELECT p FROM Project p WHERE p.isDeleted = false " +
            "AND p.startDate <= :endDate AND p.endDate >= :startDate")
    List<Project> findActiveProjectsBetween(LocalDate startDate, LocalDate endDate);

    /**
     * PM별 프로젝트 조회
     */
    @Query("SELECT p FROM Project p WHERE p.projectManagerIdx = :pmUserIdx AND p.isDeleted = false")
    List<Project> findByProjectManagerIdx(Long pmUserIdx);

    /**
     * 과거 프로젝트 조회 (진행중이 아닌 프로젝트)
     */
    @Query("SELECT p FROM Project p WHERE p.projectStatus != 'IN_PROGRESS' AND p.isDeleted = false ORDER BY p.startDate DESC")
    List<Project> findPastProjects();

    /**
     * 과거 프로젝트 중 특정 상태만 조회
     */
    @Query("SELECT p FROM Project p WHERE p.projectStatus = :status AND p.projectStatus != 'IN_PROGRESS' AND p.isDeleted = false ORDER BY p.startDate DESC")
    List<Project> findPastProjectsByStatus(String status);

    /**
     * 프로젝트 목록을 최적화된 방식으로 조회
     * 한 번의 쿼리로 PM 정보, 팀원 수, 집행액을 모두 가져옴
     */
    @Query("SELECT p.idx, p.projectName, p.clientName, p.projectManagerIdx, " +
            "pm.empName, p.startDate, p.endDate, p.projectStatus, p.description, " +
            "p.receiptUrl, p.activityBudget, p.equipmentBudget, p.materialBudget, p.progressRate, " +
            "COUNT(DISTINCT m.idx), " +
            "((SELECT COALESCE(SUM(rm.amount), 0) FROM ReceiptMeeting rm WHERE rm.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(COALESCE(rt.transportationFee, 0) + COALESCE(rt.accommodationFee, 0) + COALESCE(rt.mealFee, 0) + COALESCE(rt.otherFee, 0)), 0) FROM ReceiptTrip rt WHERE rt.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(ro.totalAmount), 0) FROM ReceiptOvertime ro WHERE ro.projectIdx = p)), " +
            "p.totalPeriodStart, p.totalPeriodEnd, " +
            "p.createdAt, p.updatedAt, p.createdUserIdx, p.updatedUserIdx " +
            "FROM Project p " +
            "LEFT JOIN p.projectManager pm " +
            "LEFT JOIN ProjectMember m ON m.projectIdx = p.idx AND m.isActive = true " +
            "WHERE p.isDeleted = false " +
            "GROUP BY p.idx, pm.empName " +
            "ORDER BY p.startDate DESC")
    List<Object[]> findAllActiveOptimized();

    /**
     * 상태별 프로젝트 목록을 최적화된 방식으로 조회
     */
    @Query("SELECT p.idx, p.projectName, p.clientName, p.projectManagerIdx, " +
            "pm.empName, p.startDate, p.endDate, p.projectStatus, p.description, " +
            "p.receiptUrl, p.activityBudget, p.equipmentBudget, p.materialBudget, p.progressRate, " +
            "COUNT(DISTINCT m.idx), " +
            "((SELECT COALESCE(SUM(rm.amount), 0) FROM ReceiptMeeting rm WHERE rm.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(COALESCE(rt.transportationFee, 0) + COALESCE(rt.accommodationFee, 0) + COALESCE(rt.mealFee, 0) + COALESCE(rt.otherFee, 0)), 0) FROM ReceiptTrip rt WHERE rt.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(ro.totalAmount), 0) FROM ReceiptOvertime ro WHERE ro.projectIdx = p)), " +
            "p.totalPeriodStart, p.totalPeriodEnd, " +
            "p.createdAt, p.updatedAt, p.createdUserIdx, p.updatedUserIdx " +
            "FROM Project p " +
            "LEFT JOIN p.projectManager pm " +
            "LEFT JOIN ProjectMember m ON m.projectIdx = p.idx AND m.isActive = true " +
            "WHERE p.projectStatus = :status AND p.isDeleted = false " +
            "GROUP BY p.idx, pm.empName " +
            "ORDER BY p.startDate DESC")
    List<Object[]> findByProjectStatusOptimized(@Param("status") String status);

    /**
     * 과거 프로젝트 목록을 최적화된 방식으로 조회
     */
    @Query("SELECT p.idx, p.projectName, p.clientName, p.projectManagerIdx, " +
            "pm.empName, p.startDate, p.endDate, p.projectStatus, p.description, " +
            "p.receiptUrl, p.activityBudget, p.equipmentBudget, p.materialBudget, p.progressRate, " +
            "COUNT(DISTINCT m.idx), " +
            "((SELECT COALESCE(SUM(rm.amount), 0) FROM ReceiptMeeting rm WHERE rm.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(COALESCE(rt.transportationFee, 0) + COALESCE(rt.accommodationFee, 0) + COALESCE(rt.mealFee, 0) + COALESCE(rt.otherFee, 0)), 0) FROM ReceiptTrip rt WHERE rt.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(ro.totalAmount), 0) FROM ReceiptOvertime ro WHERE ro.projectIdx = p)), " +
            "p.totalPeriodStart, p.totalPeriodEnd, " +
            "p.createdAt, p.updatedAt, p.createdUserIdx, p.updatedUserIdx " +
            "FROM Project p " +
            "LEFT JOIN p.projectManager pm " +
            "LEFT JOIN ProjectMember m ON m.projectIdx = p.idx AND m.isActive = true " +
            "WHERE p.projectStatus != 'IN_PROGRESS' AND p.isDeleted = false " +
            "GROUP BY p.idx, pm.empName " +
            "ORDER BY p.startDate DESC")
    List<Object[]> findPastProjectsOptimized();

    /**
     * 특정 사용자가 참여중인 프로젝트 목록 조회 (최적화)
     * memberIdx로 필터링하여 해당 사용자가 참여연구원으로 등록된 프로젝트만 반환
     */
    @Query("SELECT p.idx, p.projectName, p.clientName, p.projectManagerIdx, " +
            "pm.empName, p.startDate, p.endDate, p.projectStatus, p.description, " +
            "p.receiptUrl, p.activityBudget, p.equipmentBudget, p.materialBudget, p.progressRate, " +
            "COUNT(DISTINCT m2.idx), " +
            "((SELECT COALESCE(SUM(rm.amount), 0) FROM ReceiptMeeting rm WHERE rm.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(COALESCE(rt.transportationFee, 0) + COALESCE(rt.accommodationFee, 0) + COALESCE(rt.mealFee, 0) + COALESCE(rt.otherFee, 0)), 0) FROM ReceiptTrip rt WHERE rt.projectIdx = p.idx) + " +
            "(SELECT COALESCE(SUM(ro.totalAmount), 0) FROM ReceiptOvertime ro WHERE ro.projectIdx = p)), " +
            "p.totalPeriodStart, p.totalPeriodEnd, " +
            "p.createdAt, p.updatedAt, p.createdUserIdx, p.updatedUserIdx " +
            "FROM Project p " +
            "LEFT JOIN p.projectManager pm " +
            "INNER JOIN ProjectMember m ON m.projectIdx = p.idx AND m.employeeIdx = :memberIdx AND m.isActive = true " +
            "LEFT JOIN ProjectMember m2 ON m2.projectIdx = p.idx AND m2.isActive = true " +
            "WHERE p.isDeleted = false " +
            "GROUP BY p.idx, pm.empName " +
            "ORDER BY p.startDate DESC")
    List<Object[]> findByMemberIdxOptimized(@Param("memberIdx") Long memberIdx);
}
