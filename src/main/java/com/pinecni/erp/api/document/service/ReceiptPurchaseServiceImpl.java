package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptPurchaseAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseDTO;
import com.pinecni.erp.api.document.dto.ReceiptPurchaseItemDTO;
import com.pinecni.erp.api.document.mapper.ReceiptPurchaseMapper;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseAttachmentRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseItemRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.ReceiptPurchase;
import com.pinecni.erp.entity.ReceiptPurchaseAttachment;
import com.pinecni.erp.entity.ReceiptPurchaseItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
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
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final ProjectCardRepository projectCardRepository;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-purchase-material.pattern}")
    private String materialPattern;

    @Value("${file.project.receipt-purchase-equipment.pattern}")
    private String equipmentPattern;

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
                                                     List<MultipartFile> estimateFiles,
                                                     Long uploadUserIdx) {
        String purchaseType = dto.getPurchaseType() != null ? dto.getPurchaseType() : "material";
        String documentType = "material".equals(purchaseType) ? "재료비" : "장비비";
        String prefix = "material".equals(purchaseType) ? "MAT" : "EQP";

        // 1. approval_documents 생성 및 문서번호 채번
        String documentNo = documentSequenceService.generateDocumentNumber(documentType, prefix, uploadUserIdx);
        String docTitle = (dto.getDocumentTitle() != null && !dto.getDocumentTitle().isBlank())
                ? dto.getDocumentTitle() : documentType;
        ApprovalDocument approvalDoc = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(docTitle)
                .documentType(documentType)
                .isProject(true)
                .content(dto.getDocumentContent())
                .drafterUserIdx(uploadUserIdx)
                .createdUserIdx(uploadUserIdx)
                .updatedUserIdx(uploadUserIdx)
                .build();
        approvalDoc = approvalDocumentRepository.save(approvalDoc);

        // 2. receipt_purchase 생성
        ReceiptPurchase entity = new ReceiptPurchase();
        entity.setProjectIdx(dto.getProjectIdx());
        entity.setCardIdx(dto.getCardIdx());
        entity.setAuthorIdx(dto.getAuthorIdx());
        entity.setPurchaseType(purchaseType);
        entity.setApprovalDate(dto.getApprovalDate());
        entity.setDocumentTitle(dto.getDocumentTitle());
        entity.setDocumentContent(dto.getDocumentContent());
        entity.setPaymentType(dto.getPaymentType());
        entity.setTotalAmount(dto.getTotalAmount());
        entity.setDocumentIdx(approvalDoc.getIdx());
        entity.setIsDeleted(false);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setCreatedUserIdx(uploadUserIdx);
        entity.setUpdatedUserIdx(uploadUserIdx);

        ReceiptPurchase saved = receiptPurchaseRepository.save(entity);

        saveItems(saved.getIdx(), dto.getItems());
        saveFiles(saved.getIdx(), receiptFiles,  "RECEIPT",   uploadUserIdx, entity.getPurchaseType());
        saveFiles(saved.getIdx(), documentFiles, "DOCUMENT",  uploadUserIdx, entity.getPurchaseType());
        saveFiles(saved.getIdx(), estimateFiles, "ESTIMATE",  uploadUserIdx, entity.getPurchaseType());

        return buildDTOWithDetails(saved);
    }

    @Override
    @Transactional
    public ReceiptPurchaseDTO updateReceiptPurchase(Long idx,
                                                     ReceiptPurchaseCreateDTO dto,
                                                     List<MultipartFile> receiptFiles,
                                                     List<MultipartFile> documentFiles,
                                                     List<MultipartFile> estimateFiles,
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

        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(doc -> {
                if (dto.getDocumentTitle() != null && !dto.getDocumentTitle().isBlank()) {
                    doc.setTitle(dto.getDocumentTitle());
                }
                doc.setContent(dto.getDocumentContent());
                doc.setUpdatedUserIdx(uploadUserIdx);
                approvalDocumentRepository.save(doc);
            });
        }

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

        saveFiles(idx, receiptFiles,  "RECEIPT",  uploadUserIdx, entity.getPurchaseType());
        saveFiles(idx, documentFiles, "DOCUMENT", uploadUserIdx, entity.getPurchaseType());
        saveFiles(idx, estimateFiles, "ESTIMATE", uploadUserIdx, entity.getPurchaseType());

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

        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(doc -> {
                doc.setDeletedAt(LocalDateTime.now());
                doc.setDeletedUserIdx(deletedUserIdx);
                approvalDocumentRepository.save(doc);
            });
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptPurchaseAttachmentDTO> getAttachments(Long receiptPurchaseIdx) {
        return attachmentRepository.findByReceiptPurchaseIdxAndDeletedFalseOrderByIdxAsc(receiptPurchaseIdx)
                .stream().map(mapper::toAttachmentDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<ReceiptPurchaseAttachmentDTO> addAttachments(Long idx,
                                                              List<MultipartFile> receiptFiles,
                                                              List<MultipartFile> documentFiles,
                                                              List<MultipartFile> estimateFiles,
                                                              Long uploadUserIdx) {
        ReceiptPurchase entity = receiptPurchaseRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("구매품의를 찾을 수 없습니다. idx: " + idx));
        saveFiles(idx, receiptFiles,  "RECEIPT",  uploadUserIdx, entity.getPurchaseType());
        saveFiles(idx, documentFiles, "DOCUMENT", uploadUserIdx, entity.getPurchaseType());
        saveFiles(idx, estimateFiles, "ESTIMATE", uploadUserIdx, entity.getPurchaseType());
        return getAttachments(idx);
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptPurchaseAttachmentDTO getAttachmentById(Long attachmentIdx) {
        ReceiptPurchaseAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new RuntimeException("첨부파일을 찾을 수 없습니다."));
        return mapper.toAttachmentDTO(attachment);
    }

    @Override
    @Transactional
    public void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx) {
        ReceiptPurchaseAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new RuntimeException("첨부파일을 찾을 수 없습니다."));
        attachment.setDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now());
        attachment.setDeletedUserIdx(deletedUserIdx);
        attachmentRepository.save(attachment);
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
                    .taxType(dto.getTaxType() != null ? dto.getTaxType() : "과세")
                    .paymentAmount(dto.getPaymentAmount())
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

        ReceiptPurchase entity = receiptPurchaseRepository.findById(receiptPurchaseIdx)
                .orElseThrow(() -> new IllegalArgumentException("구매품의를 찾을 수 없습니다. idx: " + receiptPurchaseIdx));

        // 카드 뒷자리 조회
        String cardLastDigits = "no-card";
        if (entity.getCardIdx() != null) {
            var card = projectCardRepository.findById(entity.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }

        // 패턴으로 상대경로 구성
        LocalDate date = entity.getApprovalDate() != null ? entity.getApprovalDate() : LocalDate.now();
        String year = String.valueOf(date.getYear());
        String dateStr = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String pattern = "equipment".equals(purchaseType) ? equipmentPattern : materialPattern;
        String relativePath = pattern
                .replace("{projectIdx}", String.valueOf(entity.getProjectIdx()))
                .replace("{cardLastDigits}", cardLastDigits)
                .replace("{year}", year)
                .replace("{date}", dateStr);

        String fullUploadPath = baseDir + java.io.File.separator + relativePath.replace("/", java.io.File.separator);
        try {
            Files.createDirectories(Paths.get(fullUploadPath));
        } catch (IOException e) {
            log.error("업로드 디렉토리 생성 실패: {}", fullUploadPath, e);
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다: " + fullUploadPath, e);
        }

        // 표시용 파일명 기본 구성: {카드뒷자리}_{yyyyMMdd}_{총금액}_{재료비|장비비}_{문서종류}
        String displayDateStr = date.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        BigDecimal totalAmount = entity.getTotalAmount() != null ? entity.getTotalAmount() : BigDecimal.ZERO;
        String displayAmountStr = String.format("%,d원", totalAmount.longValue());
        String purchaseTypeLabel = "equipment".equals(purchaseType) ? "장비비" : "재료비";
        String docTypeLabel = switch (attachmentType) {
            case "DOCUMENT" -> "공식문서";
            case "ESTIMATE" -> "견적서";
            default -> "equipment".equals(purchaseType) ? "영수증" : "거래명세서";
        };
        String displayBaseName = cardLastDigits + "_" + displayDateStr + "_" + displayAmountStr
                + "_" + purchaseTypeLabel + "_" + docTypeLabel;

        // 기존 파일 수 (연번 오프셋)
        long existingCount = attachmentRepository
                .countByReceiptPurchaseIdxAndAttachmentTypeAndDeletedFalse(receiptPurchaseIdx, attachmentType);

        int savedCount = 0;
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            try {
                String actualName = file.getOriginalFilename();
                if (actualName == null) actualName = "unnamed_file";
                String ext = actualName.contains(".") ? actualName.substring(actualName.lastIndexOf(".")) : "";

                long seq = existingCount + savedCount + 1;
                String displayFilename = displayBaseName + "_" + seq + ext;

                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                String storedFilename = timestamp + "_" + uuid + ext;

                Files.copy(file.getInputStream(), Paths.get(fullUploadPath, storedFilename));

                ReceiptPurchaseAttachment attachment = ReceiptPurchaseAttachment.builder()
                        .receiptPurchaseIdx(receiptPurchaseIdx)
                        .originalFilename(displayFilename)
                        .storedFilename(storedFilename)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();
                attachmentRepository.save(attachment);
                savedCount++;
            } catch (IOException e) {
                log.error("파일 저장 실패: {}", file.getOriginalFilename(), e);
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }
    }
}
