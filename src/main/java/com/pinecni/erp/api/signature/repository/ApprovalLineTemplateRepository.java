package com.pinecni.erp.api.signature.repository;

import com.pinecni.erp.entity.ApprovalLineTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 결재라인 템플릿 Repository
 */
@Repository
public interface ApprovalLineTemplateRepository extends JpaRepository<ApprovalLineTemplate, Long> {

    /**
     * 문서유형별 활성 결재라인 조회 (순번 오름차순)
     *
     * @param documentType C04 문서유형 코드
     * @return 해당 문서유형의 결재라인 목록 (signature_order 오름차순)
     */
    List<ApprovalLineTemplate> findByDocumentTypeAndIsActiveTrueOrderBySignatureOrderAscSignatureSlotAsc(String documentType);
}
