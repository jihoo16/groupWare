package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ProjectRelation Repository
 */
@Repository
public interface ProjectRelationRepository extends JpaRepository<ProjectRelation, Long> {

    /**
     * 소스 프로젝트 기준 연결된 프로젝트 조회
     */
    List<ProjectRelation> findBySourceProjectIdx(Long sourceProjectIdx);

    /**
     * 타겟 프로젝트 기준 연결된 프로젝트 조회
     */
    List<ProjectRelation> findByTargetProjectIdx(Long targetProjectIdx);

    /**
     * 특정 프로젝트의 모든 관계 조회 (양방향)
     */
    @Query("SELECT r FROM ProjectRelation r WHERE r.sourceProjectIdx = :projectIdx " +
            "OR r.targetProjectIdx = :projectIdx")
    List<ProjectRelation> findAllRelationsByProjectIdx(Long projectIdx);

}
