package com.pinecni.erp.repository;

import com.pinecni.erp.entity.CodeGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
