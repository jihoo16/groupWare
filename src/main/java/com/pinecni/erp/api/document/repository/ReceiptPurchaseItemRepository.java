package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptPurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptPurchaseItemRepository extends JpaRepository<ReceiptPurchaseItem, Long> {
    List<ReceiptPurchaseItem> findByReceiptPurchaseIdxOrderBySortOrderAsc(Long receiptPurchaseIdx);
    void deleteByReceiptPurchaseIdx(Long receiptPurchaseIdx);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM ReceiptPurchaseItem i WHERE i.receiptPurchaseIdx IN :idxs ORDER BY i.receiptPurchaseIdx ASC, i.sortOrder ASC")
    List<ReceiptPurchaseItem> findByReceiptPurchaseIdxIn(@org.springframework.data.repository.query.Param("idxs") List<Long> receiptPurchaseIdxs);
}
