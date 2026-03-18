package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserCareer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserCareerRepository extends JpaRepository<UserCareer, Long> {

    List<UserCareer> findByUserIdxOrderByCareerStartDateDesc(Long userIdx);
}
