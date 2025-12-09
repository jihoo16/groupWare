package com.pinecni.erp.api.externalperson.repository;

import com.pinecni.erp.entity.ExternalPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ExternalPerson Repository
 */
@Repository
public interface ExternalPersonRepository extends JpaRepository<ExternalPerson, Long> {

    /**
     * 전체 외부인원 목록 조회 (소속회사순, 이름순)
     */
    @Query("SELECT e FROM ExternalPerson e ORDER BY e.companyName ASC, e.name ASC")
    List<ExternalPerson> findAllOrderByIdxDesc();

    /**
     * 회사명으로 검색
     */
    List<ExternalPerson> findByCompanyNameContaining(String companyName);

    /**
     * 이름으로 검색
     */
    List<ExternalPerson> findByNameContaining(String name);
}
