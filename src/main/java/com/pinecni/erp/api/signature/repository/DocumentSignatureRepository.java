package com.pinecni.erp.api.signature.repository;

import com.pinecni.erp.entity.DocumentSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 문서별 서명 기록 Repository
 */
@Repository
public interface DocumentSignatureRepository extends JpaRepository<DocumentSignature, Long> {

    /**
     * 문서의 모든 서명 기록 조회 (순번 오름차순)
     */
    List<DocumentSignature> findByDocumentIdxOrderBySignatureOrderAscIdxAsc(Long documentIdx);

    /**
     * 문서 + 서명자 + 슬롯으로 특정 서명 행 조회
     * <p>주의: signerUserIdx 는 isExternal 에 따라 users.idx 또는 external_person.idx 를 가리키므로
     *        polymorphic 충돌 방지를 위해 호출부에서 isExternal 분기를 명시한 메서드를 우선 사용한다.</p>
     */
    Optional<DocumentSignature> findByDocumentIdxAndSignerUserIdxAndSignatureSlot(
            Long documentIdx, Long signerUserIdx, String signatureSlot);

    /**
     * 문서 + 서명자 + 슬롯 + isExternal 로 특정 서명 행 조회 (polymorphic idx 충돌 방지)
     */
    Optional<DocumentSignature> findByDocumentIdxAndSignerUserIdxAndSignatureSlotAndIsExternal(
            Long documentIdx, Long signerUserIdx, String signatureSlot, Boolean isExternal);

    /**
     * 문서의 미완료 서명 수 (C1402/C1403 외, linked 제외)
     * - isAllSignaturesComplete() 게이트 검증용
     */
    @Query("SELECT COUNT(ds) FROM DocumentSignature ds " +
           "WHERE ds.documentIdx = :documentIdx " +
           "AND ds.linkedSignatureIdx IS NULL " +
           "AND ds.status NOT IN ('C1402', 'C1403')")
    long countPendingByDocumentIdx(@Param("documentIdx") Long documentIdx);

    /**
     * 문서에 서명 완료된 행이 1개라도 있는지 확인 (문서 편집 잠금 검증용)
     * - hasAnySignatureCaptured() 용
     */
    @Query("SELECT CASE WHEN COUNT(ds) > 0 THEN true ELSE false END " +
           "FROM DocumentSignature ds " +
           "WHERE ds.documentIdx = :documentIdx " +
           "AND ds.status = 'C1402'")
    boolean existsCompletedByDocumentIdx(@Param("documentIdx") Long documentIdx);

    /**
     * 특정 단계(order)의 모든 서명 행 조회 (linked 제외)
     * - advanceToNextOrder() 용: 해당 단계 전원 완료 여부 확인
     */
    @Query("SELECT ds FROM DocumentSignature ds " +
           "WHERE ds.documentIdx = :documentIdx " +
           "AND ds.signatureOrder = :signatureOrder " +
           "AND ds.linkedSignatureIdx IS NULL")
    List<DocumentSignature> findByDocumentIdxAndSignatureOrderExcludingLinked(
            @Param("documentIdx") Long documentIdx,
            @Param("signatureOrder") Integer signatureOrder);

    /**
     * 특정 서명 행에 linked된 하위 행들 조회
     * - 연동 서명 처리용: 상위 행이 서명되면 linked 하위 행들도 자동 완료
     */
    List<DocumentSignature> findByLinkedSignatureIdx(Long linkedSignatureIdx);

    /**
     * 사용자(내부)의 미처리 서명 수 (홈 화면 알림 배지용)
     * - status=C1401 (서명대기) + requested_at NOT NULL (차례 도래)
     * - is_external=false 강제 — users.idx ↔ external_person.idx 폴리모픽 충돌 방지
     */
    @Query("SELECT COUNT(ds) FROM DocumentSignature ds " +
           "WHERE ds.signerUserIdx = :userIdx " +
           "AND ds.isExternal = false " +
           "AND ds.status = 'C1401' " +
           "AND ds.requestedAt IS NOT NULL " +
           "AND ds.linkedSignatureIdx IS NULL")
    long countPendingBySignerUserIdx(@Param("userIdx") Long userIdx);

    /**
     * 사용자(내부)의 PENDING 서명 행 전체 (requested_at 무관) — 자가복구용.
     * <p>"활성화되어야 할 행이 누락된" 상태를 검출하려면 requested_at 가 NULL 인 행도 봐야 함.</p>
     */
    @Query("SELECT ds FROM DocumentSignature ds " +
           "WHERE ds.signerUserIdx = :userIdx " +
           "AND ds.isExternal = false " +
           "AND ds.status = 'C1401' " +
           "AND ds.linkedSignatureIdx IS NULL")
    List<DocumentSignature> findAllPendingBySignerUserIdxIgnoringRequested(@Param("userIdx") Long userIdx);

    /**
     * 사용자(내부)의 서명 대기 목록 (홈 위젯용)
     * - 차례 도래 + 미서명 + linked 아님
     * - is_external=false 강제 (외부인 행이 동일 idx로 끼어드는 폴리모픽 충돌 방지)
     */
    @Query("SELECT ds FROM DocumentSignature ds " +
           "WHERE ds.signerUserIdx = :userIdx " +
           "AND ds.isExternal = false " +
           "AND ds.status = 'C1401' " +
           "AND ds.requestedAt IS NOT NULL " +
           "AND ds.linkedSignatureIdx IS NULL " +
           "ORDER BY ds.requestedAt DESC")
    List<DocumentSignature> findPendingBySignerUserIdx(@Param("userIdx") Long userIdx);

    /**
     * 사용자(내부)의 서명 완료 이력 (최근 순)
     * - is_external=false 강제 (폴리모픽 충돌 방지)
     */
    @Query("SELECT ds FROM DocumentSignature ds " +
           "WHERE ds.signerUserIdx = :userIdx " +
           "AND ds.isExternal = false " +
           "AND ds.status = 'C1402' " +
           "AND ds.linkedSignatureIdx IS NULL " +
           "ORDER BY ds.signedAt DESC")
    List<DocumentSignature> findCompletedBySignerUserIdx(@Param("userIdx") Long userIdx);

    /**
     * 여러 문서의 서명 현황 배치 조회 (목록 페이지용)
     * - linked 제외, 문서별 총 행수 / 서명완료 행수 반환
     * @return Object[]{documentIdx(Long), totalCount(Long), signedCount(Long)}
     */
    @Query("SELECT ds.documentIdx, COUNT(ds), " +
           "SUM(CASE WHEN ds.status IN ('C1402','C1403') THEN 1 ELSE 0 END) " +
           "FROM DocumentSignature ds " +
           "WHERE ds.documentIdx IN :documentIdxList " +
           "AND ds.linkedSignatureIdx IS NULL " +
           "GROUP BY ds.documentIdx")
    List<Object[]> countSignatureStatusBatch(@Param("documentIdxList") List<Long> documentIdxList);
}
