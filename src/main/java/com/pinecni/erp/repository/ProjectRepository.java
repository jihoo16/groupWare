package com.pinecni.erp.repository;

import com.pinecni.erp.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Project Repository
 */
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    /**
     * 프로젝트 코드로 조회
     */
    Optional<Project> findByProjectCode(String projectCode);

    /**
     * 상태별 프로젝트 조회
     */
    @Query("SELECT p FROM Project p WHERE p.status = :status AND p.deletedAt IS NULL " +
            "ORDER BY p.createdAt DESC")
    List<Project> findByStatus(String status);

    /**
     * 활성 프로젝트 조회 (삭제되지 않은)
     */
    @Query("SELECT p FROM Project p WHERE p.deletedAt IS NULL ORDER BY p.createdAt DESC")
    List<Project> findAllActive();

    /**
     * 프로젝트명 검색
     */
    @Query("SELECT p FROM Project p WHERE p.projectName LIKE %:name% AND p.deletedAt IS NULL")
    List<Project> searchByName(String name);

    /**
     * 기간별 진행 중인 프로젝트 조회
     */
    @Query("SELECT p FROM Project p WHERE p.deletedAt IS NULL " +
            "AND p.startDate <= :endDate AND (p.endDate IS NULL OR p.endDate >= :startDate)")
    List<Project> findActiveProjectsBetween(LocalDate startDate, LocalDate endDate);

    /**
     * PM별 프로젝트 조회
     */
    @Query("SELECT p FROM Project p WHERE p.pmUserIdx = :pmUserIdx AND p.deletedAt IS NULL")
    List<Project> findByPmUserIdx(Long pmUserIdx);
}
