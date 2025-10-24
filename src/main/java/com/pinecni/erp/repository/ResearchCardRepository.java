package com.pinecni.erp.repository;

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
     * 카드번호로 조회
     */
    Optional<ResearchCard> findByCardNumber(String cardNumber);

    /**
     * 프로젝트별 연구비카드 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.projectIdx = :projectIdx AND c.deletedAt IS NULL")
    List<ResearchCard> findByProjectIdx(Long projectIdx);

    /**
     * 카드사별 카드 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.cardCompany = :cardCompany AND c.deletedAt IS NULL")
    List<ResearchCard> findByCardCompany(String cardCompany);

    /**
     * 활성 카드 목록 조회
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.deletedAt IS NULL ORDER BY c.createdAt DESC")
    List<ResearchCard> findAllActive();

    /**
     * 카드 검색 (카드번호 부분 일치)
     */
    @Query("SELECT c FROM ResearchCard c WHERE c.cardNumber LIKE %:keyword% AND c.deletedAt IS NULL")
    List<ResearchCard> searchByCardNumber(String keyword);
}
