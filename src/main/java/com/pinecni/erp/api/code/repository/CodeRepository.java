package com.pinecni.erp.api.code.repository;

import com.pinecni.erp.entity.Code;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Code Repository
 */
@Repository
public interface CodeRepository extends JpaRepository<Code, Long> {

    /**
     * 그룹별 코드 목록 조회 (idx DESC)
     */
    @Query("SELECT c FROM Code c WHERE c.groupCode = :groupCode ORDER BY c.idx DESC")
    List<Code> findByGroupCode(String groupCode);

    /**
     * 코드로 조회
     */
    Optional<Code> findByCode(String code);

    /**
     * 그룹 및 코드로 조회
     */
    Optional<Code> findByGroupCodeAndCode(String groupCode, String code);

    /**
     * 활성화된 코드 목록 조회 (sort_order ASC)
     */
    @Query("SELECT c FROM Code c WHERE c.groupCode = :groupCode AND c.useYn = 'Y' ORDER BY c.sortOrder ASC, c.idx ASC")
    List<Code> findActiveByGroupCode(String groupCode);

    /**
     * 사용 여부별 조회 (idx DESC)
     */
    @Query("SELECT c FROM Code c WHERE c.useYn = :useYn ORDER BY c.idx DESC")
    List<Code> findByUseYn(String useYn);

    /**
     * 그룹 및 코드명으로 조회
     */
    Optional<Code> findByGroupCodeAndCodeName(String groupCode, String codeName);
}
