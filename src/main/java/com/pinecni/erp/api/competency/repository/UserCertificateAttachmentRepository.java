package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserCertificateAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserCertificateAttachmentRepository extends JpaRepository<UserCertificateAttachment, Long> {

    /** 단일 자격증의 첨부 목록 (uploaded_at 오름차순) */
    List<UserCertificateAttachment> findByUserCertificateIdxOrderByUploadedAtAsc(Long userCertificateIdx);

    /** 여러 자격증 idx 의 첨부 목록 일괄 조회 — N+1 방지용 */
    List<UserCertificateAttachment> findByUserCertificateIdxInOrderByUploadedAtAsc(Collection<Long> userCertificateIdxList);
}
