package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
            "ORDER BY p.createdAt DESC")
    List<Project> findByProjectStatus(String status);

    /**
     * 활성 프로젝트 조회 (삭제되지 않은)
     */
    @Query("SELECT p FROM Project p WHERE p.isDeleted = false ORDER BY p.createdAt DESC")
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
}
