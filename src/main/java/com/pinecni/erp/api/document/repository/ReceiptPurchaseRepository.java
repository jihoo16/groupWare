package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptPurchase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReceiptPurchaseRepository extends JpaRepository<ReceiptPurchase, Long> {

    @Query("SELECT COALESCE(SUM(rp.totalAmount), 0) FROM ReceiptPurchase rp WHERE rp.projectIdx = :projectIdx AND rp.isDeleted = false")
    BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);

    @Query("SELECT COALESCE(SUM(rp.totalAmount), 0) FROM ReceiptPurchase rp WHERE rp.projectIdx = :projectIdx AND rp.purchaseType = :purchaseType AND rp.isDeleted = false")
    BigDecimal sumAmountByProjectIdxAndPurchaseType(@Param("projectIdx") Long projectIdx, @Param("purchaseType") String purchaseType);

    @Query("SELECT rp FROM ReceiptPurchase rp WHERE rp.projectIdx = :projectIdx ORDER BY rp.approvalDate DESC")
    List<ReceiptPurchase> findByProjectIdxOrderByApprovalDateDesc(@Param("projectIdx") Long projectIdx);

    @Query("SELECT rp FROM ReceiptPurchase rp WHERE rp.purchaseType = :purchaseType ORDER BY rp.approvalDate DESC")
    List<ReceiptPurchase> findByPurchaseTypeOrderByApprovalDateDesc(@Param("purchaseType") String purchaseType);

    List<ReceiptPurchase> findByAuthorIdxOrderByApprovalDateDesc(Long authorIdx);

    List<ReceiptPurchase> findAllByOrderByApprovalDateDesc();

    Optional<ReceiptPurchase> findByDocumentIdx(Long documentIdx);

    /**
     * 참여기간 검증용 — 작성자가 본 프로젝트 내에서 작성한 모든 활성 구매(재료비/장비비) 조회.
     * @SQLRestriction("is_deleted = false") 가 자동 적용된다.
     */
    @Query("SELECT rp FROM ReceiptPurchase rp " +
            "WHERE rp.authorIdx = :authorIdx " +
            "AND rp.projectIdx = :projectIdx")
    List<ReceiptPurchase> findActiveByAuthorAndProject(
            @Param("authorIdx") Long authorIdx,
            @Param("projectIdx") Long projectIdx);

    @Query("SELECT rp FROM ReceiptPurchase rp WHERE rp.documentIdx IN :documentIdxs")
    List<ReceiptPurchase> findByDocumentIdxIn(@Param("documentIdxs") List<Long> documentIdxs);
}
