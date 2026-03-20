package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptPurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptPurchaseItemRepository extends JpaRepository<ReceiptPurchaseItem, Long> {
    List<ReceiptPurchaseItem> findByReceiptPurchaseIdxOrderBySortOrderAsc(Long receiptPurchaseIdx);
    void deleteByReceiptPurchaseIdx(Long receiptPurchaseIdx);
}
