package com.pinecni.erp.api.code.repository;

import com.pinecni.erp.entity.Code;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Code Repository
 *
 * 캐시 정책: 조회 메서드는 "codes" 캐시에 저장.
 *   - 무효화는 CodeService 의 쓰기 메서드(@CacheEvict allEntries=true) 에서만 수행.
 *   - 현재 save/delete 호출부는 CodeService 에 한정됨 — 외부 직접 쓰기 없음 (검증 완료 2026-04-14).
 */
@Repository
public interface CodeRepository extends JpaRepository<Code, Long> {

    /**
     * 그룹별 코드 목록 조회 (idx DESC)
     */
    @Cacheable(value = "codes", key = "'byGroup:' + #groupCode")
    @Query("SELECT c FROM Code c WHERE c.groupCode = :groupCode ORDER BY c.idx DESC")
    List<Code> findByGroupCode(String groupCode);

    /**
     * 코드로 조회
     */
    @Cacheable(value = "codes", key = "'byCode:' + #code")
    Optional<Code> findByCode(String code);

    /**
     * 그룹 및 코드로 조회
     */
    @Cacheable(value = "codes", key = "'byGroupAndCode:' + #groupCode + ':' + #code")
    Optional<Code> findByGroupCodeAndCode(String groupCode, String code);

    /**
     * 활성화된 코드 목록 조회 (sort_order ASC)
     */
    @Cacheable(value = "codes", key = "'activeByGroup:' + #groupCode")
    @Query("SELECT c FROM Code c WHERE c.groupCode = :groupCode AND c.useYn = 'Y' ORDER BY c.sortOrder ASC, c.idx ASC")
    List<Code> findActiveByGroupCode(String groupCode);

    /**
     * 사용 여부별 조회 (idx DESC)
     */
    @Cacheable(value = "codes", key = "'byUseYn:' + #useYn")
    @Query("SELECT c FROM Code c WHERE c.useYn = :useYn ORDER BY c.idx DESC")
    List<Code> findByUseYn(String useYn);

    /**
     * 그룹 및 코드명으로 조회
     */
    @Cacheable(value = "codes", key = "'byGroupAndName:' + #groupCode + ':' + #codeName")
    Optional<Code> findByGroupCodeAndCodeName(String groupCode, String codeName);
}
