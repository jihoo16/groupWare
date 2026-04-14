package com.pinecni.erp.api.code.repository;

import com.pinecni.erp.entity.CodeGroup;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * CodeGroup Repository
 *
 * 캐시 정책: 조회 메서드는 "codeGroups" 캐시에 저장.
 *   - 무효화는 CodeGroupService 의 쓰기 메서드(@CacheEvict allEntries=true) 에서만 수행.
 *   - 현재 save/delete 호출부는 CodeGroupService 에 한정됨 — 외부 직접 쓰기 없음 (검증 완료 2026-04-14).
 */
@Repository
public interface CodeGroupRepository extends JpaRepository<CodeGroup, Long> {

    /**
     * 그룹 코드로 조회
     */
    @Cacheable(value = "codeGroups", key = "'byCode:' + #groupCode")
    Optional<CodeGroup> findByGroupCode(String groupCode);

    /**
     * 그룹명으로 조회
     */
    @Cacheable(value = "codeGroups", key = "'byName:' + #groupName")
    Optional<CodeGroup> findByGroupName(String groupName);

    /**
     * 활성화된 그룹코드 목록 조회
     */
    @Cacheable(value = "codeGroups", key = "'allActive'")
    @Query("SELECT cg FROM CodeGroup cg WHERE cg.useYn = 'Y' ORDER BY cg.idx DESC")
    List<CodeGroup> findAllActive();

    /**
     * 전체 그룹코드 목록 조회 (idx DESC)
     */
    @Cacheable(value = "codeGroups", key = "'allOrdered'")
    @Query("SELECT cg FROM CodeGroup cg ORDER BY cg.idx DESC")
    List<CodeGroup> findAllOrdered();
}
