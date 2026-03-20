package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptPurchaseAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ReceiptPurchaseService {
    List<ReceiptPurchaseDTO> getAllReceiptPurchases();
    List<ReceiptPurchaseDTO> getReceiptPurchasesByType(String purchaseType);
    List<ReceiptPurchaseDTO> getReceiptPurchasesByProjectIdx(Long projectIdx);
    List<ReceiptPurchaseDTO> getReceiptPurchasesByAuthorIdx(Long authorIdx);
    ReceiptPurchaseDTO getReceiptPurchaseById(Long idx);
    ReceiptPurchaseDTO getReceiptPurchaseByDocumentIdx(Long documentIdx);
    ReceiptPurchaseDTO createReceiptPurchase(ReceiptPurchaseCreateDTO createDTO,
                                             List<MultipartFile> receiptFiles,
                                             List<MultipartFile> documentFiles,
                                             Long uploadUserIdx);
    ReceiptPurchaseDTO updateReceiptPurchase(Long idx,
                                             ReceiptPurchaseCreateDTO updateDTO,
                                             List<MultipartFile> receiptFiles,
                                             List<MultipartFile> documentFiles,
                                             List<Long> deletedAttachmentIds,
                                             Long uploadUserIdx);
    void deleteReceiptPurchase(Long idx, Long deletedUserIdx);
    List<ReceiptPurchaseAttachmentDTO> getAttachments(Long receiptPurchaseIdx);
}
