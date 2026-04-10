package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserSchoolAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserSchoolAttachmentRepository extends JpaRepository<UserSchoolAttachment, Long> {

    /** 단일 학력의 첨부 목록 (uploaded_at 오름차순) */
    List<UserSchoolAttachment> findByUserSchoolIdxOrderByUploadedAtAsc(Long userSchoolIdx);

    /** 여러 학력 idx 의 첨부 목록 일괄 조회 — N+1 방지용 */
    List<UserSchoolAttachment> findByUserSchoolIdxInOrderByUploadedAtAsc(Collection<Long> userSchoolIdxList);
}
