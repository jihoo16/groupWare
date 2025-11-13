package com.pinecni.erp.api.code.repository;

import com.pinecni.erp.entity.CodeGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * CodeGroup Repository
 */
@Repository
public interface CodeGroupRepository extends JpaRepository<CodeGroup, Long> {

    /**
     * 그룹 코드로 조회
     */
    Optional<CodeGroup> findByGroupCode(String groupCode);

    /**
     * 그룹명으로 조회
     */
    Optional<CodeGroup> findByGroupName(String groupName);

    /**
     * 활성화된 그룹코드 목록 조회
     */
    @Query("SELECT cg FROM CodeGroup cg WHERE cg.useYn = 'Y' ORDER BY cg.idx DESC")
    List<CodeGroup> findAllActive();

    /**
     * 전체 그룹코드 목록 조회 (idx DESC)
     */
    @Query("SELECT cg FROM CodeGroup cg ORDER BY cg.idx DESC")
    List<CodeGroup> findAllOrdered();
}
