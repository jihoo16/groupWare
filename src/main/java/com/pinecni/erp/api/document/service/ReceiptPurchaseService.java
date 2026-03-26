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
    ReceiptPurchaseDTO createReceiptPurchase(ReceiptPurchaseCreateDTO createDTO,
                                             List<MultipartFile> receiptFiles,
                                             List<MultipartFile> documentFiles,
                                             List<MultipartFile> estimateFiles,
                                             Long uploadUserIdx);
    ReceiptPurchaseDTO updateReceiptPurchase(Long idx,
                                             ReceiptPurchaseCreateDTO updateDTO,
                                             List<MultipartFile> receiptFiles,
                                             List<MultipartFile> documentFiles,
                                             List<MultipartFile> estimateFiles,
                                             List<Long> deletedAttachmentIds,
                                             Long uploadUserIdx);
    void deleteReceiptPurchase(Long idx, Long deletedUserIdx);
    List<ReceiptPurchaseAttachmentDTO> getAttachments(Long receiptPurchaseIdx);
    List<ReceiptPurchaseAttachmentDTO> addAttachments(Long idx,
                                                      List<MultipartFile> receiptFiles,
                                                      List<MultipartFile> documentFiles,
                                                      List<MultipartFile> estimateFiles,
                                                      Long uploadUserIdx);
    ReceiptPurchaseAttachmentDTO getAttachmentById(Long attachmentIdx);
    void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx);
}
