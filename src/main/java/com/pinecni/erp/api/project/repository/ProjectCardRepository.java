package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ProjectCard Repository
 */
@Repository
public interface ProjectCardRepository extends JpaRepository<ProjectCard, Long> {

    /**
     * 카드 뒷 4자리로 조회
     */
    @Query("SELECT c FROM ProjectCard c WHERE c.cardLastDigits = :lastDigits AND c.isActive = true")
    List<ProjectCard> findByCardLastDigits(String lastDigits);

    /**
     * 프로젝트별 카드 조회
     */
    @Query("SELECT c FROM ProjectCard c WHERE c.projectIdx = :projectIdx AND c.isActive = true")
    List<ProjectCard> findByProjectIdx(Long projectIdx);

    /**
     * 카드사별 카드 조회
     */
    @Query("SELECT c FROM ProjectCard c WHERE c.cardCompany = :cardCompany AND c.isActive = true")
    List<ProjectCard> findByCardCompany(String cardCompany);

    /**
     * 활성 카드 목록 조회
     */
    @Query("SELECT c FROM ProjectCard c WHERE c.isActive = true ORDER BY c.createdAt DESC")
    List<ProjectCard> findAllActive();

    /**
     * 카드 닉네임 검색
     */
    @Query("SELECT c FROM ProjectCard c WHERE c.cardNickname LIKE %:keyword% AND c.isActive = true")
    List<ProjectCard> searchByNickname(String keyword);

    /**
     * 프로젝트와 카드사로 조회
     */
    @Query("SELECT c FROM ProjectCard c WHERE c.projectIdx = :projectIdx " +
            "AND c.cardCompany = :cardCompany AND c.isActive = true")
    List<ProjectCard> findByProjectIdxAndCardCompany(Long projectIdx, String cardCompany);
}
