package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptPurchaseAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptPurchaseAttachmentRepository extends JpaRepository<ReceiptPurchaseAttachment, Long> {
    List<ReceiptPurchaseAttachment> findByReceiptPurchaseIdxAndDeletedFalseOrderByIdxAsc(Long receiptPurchaseIdx);
    void deleteByReceiptPurchaseIdx(Long receiptPurchaseIdx);
}
