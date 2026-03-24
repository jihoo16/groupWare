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
}
