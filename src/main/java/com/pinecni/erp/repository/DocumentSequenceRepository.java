package com.pinecni.erp.repository;

import com.pinecni.erp.entity.DocumentSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * DocumentSequence Repository
 */
@Repository
public interface DocumentSequenceRepository extends JpaRepository<DocumentSequence, Long> {

    /**
     * 문서 유형과 연도로 시퀀스 조회
     */
    Optional<DocumentSequence> findByDocumentTypeAndYear(String documentType, Integer year);

    /**
     * 문서 유형별 시퀀스 조회 (모든 연도)
     */
    Optional<DocumentSequence> findByDocumentType(String documentType);
}
