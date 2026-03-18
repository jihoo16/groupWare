package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserCertificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserCertificateRepository extends JpaRepository<UserCertificate, Long> {

    List<UserCertificate> findByUserIdxOrderByIssuedDateDesc(Long userIdx);
}
