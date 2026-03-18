package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserSchool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserSchoolRepository extends JpaRepository<UserSchool, Long> {

    List<UserSchool> findByUserIdxOrderByGraduationDateDesc(Long userIdx);
}
