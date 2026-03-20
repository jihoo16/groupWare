package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptPurchaseAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseItemDTO;
import com.pinecni.erp.api.document.mapper.ReceiptPurchaseMapper;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseAttachmentRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseItemRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseRepository;
import com.pinecni.erp.entity.ReceiptPurchase;
import com.pinecni.erp.entity.ReceiptPurchaseAttachment;
import com.pinecni.erp.entity.ReceiptPurchaseItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptPurchaseServiceImpl implements ReceiptPurchaseService {

    private final ReceiptPurchaseRepository receiptPurchaseRepository;
    private final ReceiptPurchaseItemRepository itemRepository;
    private final ReceiptPurchaseAttachmentRepository attachmentRepository;
    private final ReceiptPurchaseMapper mapper;

    @Value("${file.base.dir}")
    private String baseDir;

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptPurchaseDTO> getAllReceiptPurchases() {
        return receiptPurchaseRepository.findAllByOrderByApprovalDateDesc()
                .stream().map(this::buildDTOWithDetails).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptPurchaseDTO> getReceiptPurchasesByType(String purchaseType) {
        return receiptPurchaseRepository.findByPurchaseTypeOrderByApprovalDateDesc(purchaseType)
                .stream().map(this::buildDTOWithDetails).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptPurchaseDTO> getReceiptPurchasesByProjectIdx(Long projectIdx) {
        return receiptPurchaseRepository.findByProjectIdxOrderByApprovalDateDesc(projectIdx)
                .stream().map(mapper::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptPurchaseDTO> getReceiptPurchasesByAuthorIdx(Long authorIdx) {
        return receiptPurchaseRepository.findByAuthorIdxOrderByApprovalDateDesc(authorIdx)
                .stream().map(mapper::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptPurchaseDTO getReceiptPurchaseById(Long idx) {
        ReceiptPurchase entity = receiptPurchaseRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("구매품의를 찾을 수 없습니다. idx: " + idx));
        return buildDTOWithDetails(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptPurchaseDTO getReceiptPurchaseByDocumentIdx(Long documentIdx) {
        ReceiptPurchase entity = receiptPurchaseRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("구매품의를 찾을 수 없습니다. documentIdx: " + documentIdx));
        return buildDTOWithDetails(entity);
    }

    private ReceiptPurchaseDTO buildDTOWithDetails(ReceiptPurchase entity) {
        List<ReceiptPurchaseItem> items = itemRepository.findByReceiptPurchaseIdxOrderBySortOrderAsc(entity.getIdx());
        List<ReceiptPurchaseAttachment> attachments = attachmentRepository
                .findByReceiptPurchaseIdxAndDeletedFalseOrderByIdxAsc(entity.getIdx());
        return mapper.toDTOWithDetails(entity, items, attachments);
    }

    @Override
    @Transactional
    public ReceiptPurchaseDTO createReceiptPurchase(ReceiptPurchaseCreateDTO dto,
                                                     List<MultipartFile> receiptFiles,
                                                     List<MultipartFile> documentFiles,
                                                     Long uploadUserIdx) {
        ReceiptPurchase entity = new ReceiptPurchase();
        entity.setProjectIdx(dto.getProjectIdx());
        entity.setCardIdx(dto.getCardIdx());
        entity.setAuthorIdx(dto.getAuthorIdx());
        entity.setPurchaseType(dto.getPurchaseType() != null ? dto.getPurchaseType() : "material");
        entity.setApprovalDate(dto.getApprovalDate());
        entity.setDocumentTitle(dto.getDocumentTitle());
        entity.setDocumentContent(dto.getDocumentContent());
        entity.setPaymentType(dto.getPaymentType());
        entity.setTotalAmount(dto.getTotalAmount());
        entity.setIsDeleted(false);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setCreatedUserIdx(uploadUserIdx);
        entity.setUpdatedUserIdx(uploadUserIdx);

        ReceiptPurchase saved = receiptPurchaseRepository.save(entity);

        saveItems(saved.getIdx(), dto.getItems());
        saveFiles(saved.getIdx(), receiptFiles, "RECEIPT", uploadUserIdx, entity.getPurchaseType());
        saveFiles(saved.getIdx(), documentFiles, "DOCUMENT", uploadUserIdx, entity.getPurchaseType());

        return buildDTOWithDetails(saved);
    }

    @Override
    @Transactional
    public ReceiptPurchaseDTO updateReceiptPurchase(Long idx,
                                                     ReceiptPurchaseCreateDTO dto,
                                                     List<MultipartFile> receiptFiles,
                                                     List<MultipartFile> documentFiles,
                                                     List<Long> deletedAttachmentIds,
                                                     Long uploadUserIdx) {
        ReceiptPurchase entity = receiptPurchaseRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("구매품의를 찾을 수 없습니다. idx: " + idx));

        entity.setProjectIdx(dto.getProjectIdx());
        entity.setCardIdx(dto.getCardIdx());
        entity.setAuthorIdx(dto.getAuthorIdx());
        entity.setPurchaseType(dto.getPurchaseType() != null ? dto.getPurchaseType() : entity.getPurchaseType());
        entity.setApprovalDate(dto.getApprovalDate());
        entity.setDocumentTitle(dto.getDocumentTitle());
        entity.setDocumentContent(dto.getDocumentContent());
        entity.setPaymentType(dto.getPaymentType());
        entity.setTotalAmount(dto.getTotalAmount());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedUserIdx(uploadUserIdx);

        itemRepository.deleteByReceiptPurchaseIdx(idx);
        saveItems(idx, dto.getItems());

        if (deletedAttachmentIds != null) {
            for (Long attachId : deletedAttachmentIds) {
                attachmentRepository.findById(attachId).ifPresent(a -> {
                    a.setDeleted(true);
                    a.setDeletedAt(LocalDateTime.now());
                    a.setDeletedUserIdx(uploadUserIdx);
                    attachmentRepository.save(a);
                });
            }
        }

        saveFiles(idx, receiptFiles, "RECEIPT", uploadUserIdx, entity.getPurchaseType());
        saveFiles(idx, documentFiles, "DOCUMENT", uploadUserIdx, entity.getPurchaseType());

        return buildDTOWithDetails(entity);
    }

    @Override
    @Transactional
    public void deleteReceiptPurchase(Long idx, Long deletedUserIdx) {
        ReceiptPurchase entity = receiptPurchaseRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("구매품의를 찾을 수 없습니다. idx: " + idx));
        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setDeletedUserIdx(deletedUserIdx);
        receiptPurchaseRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptPurchaseAttachmentDTO> getAttachments(Long receiptPurchaseIdx) {
        return attachmentRepository.findByReceiptPurchaseIdxAndDeletedFalseOrderByIdxAsc(receiptPurchaseIdx)
                .stream().map(mapper::toAttachmentDTO).collect(Collectors.toList());
    }

    private void saveItems(Long receiptPurchaseIdx, List<ReceiptPurchaseItemDTO> items) {
        if (items == null || items.isEmpty()) return;
        for (int i = 0; i < items.size(); i++) {
            ReceiptPurchaseItemDTO dto = items.get(i);
            ReceiptPurchaseItem item = ReceiptPurchaseItem.builder()
                    .receiptPurchaseIdx(receiptPurchaseIdx)
                    .itemDate(dto.getItemDate() != null && !dto.getItemDate().isBlank()
                            ? LocalDate.parse(dto.getItemDate()) : null)
                    .itemDesc(dto.getItemDesc())
                    .quantity(dto.getQuantity())
                    .supplyAmount(dto.getSupplyAmount())
                    .taxAmount(dto.getTaxAmount())
                    .remark(dto.getRemark())
                    .sortOrder(i)
                    .build();
            itemRepository.save(item);
        }
    }

    private void saveFiles(Long receiptPurchaseIdx, List<MultipartFile> files,
                           String attachmentType, Long uploadUserIdx, String purchaseType) {
        if (files == null || files.isEmpty()) return;
        String subDir = "receipt-purchase/" + purchaseType;
        String uploadDir = baseDir + File.separator + subDir.replace("/", File.separator);
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            try {
                String originalFilename = file.getOriginalFilename();
                String ext = (originalFilename != null && originalFilename.contains("."))
                        ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
                String storedFilename = UUID.randomUUID() + ext;
                Path targetPath = Paths.get(uploadDir, storedFilename);
                Files.copy(file.getInputStream(), targetPath);

                ReceiptPurchaseAttachment attachment = ReceiptPurchaseAttachment.builder()
                        .receiptPurchaseIdx(receiptPurchaseIdx)
                        .originalFilename(originalFilename)
                        .storedFilename(storedFilename)
                        .filePath(subDir + "/" + storedFilename)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();
                attachmentRepository.save(attachment);
            } catch (IOException e) {
                log.error("파일 저장 실패: {}", file.getOriginalFilename(), e);
            }
        }
    }
}
