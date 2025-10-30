package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ResearchCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * ResearchCard Repository
 */
@Repository
public interface ResearchCardRepository extends JpaRepository<ResearchCard, Long> {

    /**
     * 카드 뒷 4자리로 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.cardLastDigits = :lastDigits AND c.isActive = true")
    List<ResearchCard> findByCardLastDigits(String lastDigits);

    /**
     * 프로젝트별 연구비카드 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.projectIdx = :projectIdx AND c.isActive = true")
    List<ResearchCard> findByProjectIdx(Long projectIdx);

    /**
     * 카드사별 카드 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.cardCompany = :cardCompany AND c.isActive = true")
    List<ResearchCard> findByCardCompany(String cardCompany);

    /**
     * 활성 카드 목록 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.isActive = true ORDER BY c.createdAt DESC")
    List<ResearchCard> findAllActive();

    /**
     * 카드 닉네임 검색
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.cardNickname LIKE %:keyword% AND c.isActive = true")
    List<ResearchCard> searchByNickname(String keyword);

    /**
     * 프로젝트와 카드사로 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.projectIdx = :projectIdx " +
            "AND c.cardCompany = :cardCompany AND c.isActive = true")
    List<ResearchCard> findByProjectIdxAndCardCompany(Long projectIdx, String cardCompany);
}
