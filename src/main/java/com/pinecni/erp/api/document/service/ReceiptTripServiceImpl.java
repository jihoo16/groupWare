package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.repository.DocumentSequenceRepository;
import com.pinecni.erp.api.document.dto.ReceiptTripAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDailyExpenseDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripDTO;
import com.pinecni.erp.api.document.dto.ReceiptTripUpdateDTO;
import com.pinecni.erp.api.document.mapper.ReceiptTripMapper;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.document.repository.ReceiptTripAttachmentRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripDailyExpenseRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.entity.*;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 연구비증빙 단독출장 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptTripServiceImpl implements ReceiptTripService {

    private final ReceiptTripRepository receiptTripRepository;
    private final ReceiptTripDailyExpenseRepository dailyExpenseRepository;
    private final ReceiptAttendeeRepository receiptAttendeeRepository;
    private final ReceiptTripAttachmentRepository attachmentRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceRepository documentSequenceRepository;
    private final ProjectCardRepository projectCardRepository;
    private final ReceiptTripMapper mapper;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-trip.pattern}")
    private String uploadPattern;

    private static final String DOCUMENT_TYPE = "receipt_trip";
    private static final String PREFIX        = "RCT";

    // ══════════════════════════════════════════════════════════════
    // 출장 기본 CRUD
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getAllReceiptTrips() {
        log.debug("전체 출장 목록 조회");
        return receiptTripRepository.findAllByOrderByTripDateDesc()
                .stream().map(mapper::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptTripDTO getReceiptTripById(Long idx) {
        log.debug("출장 상세 조회 - idx: {}", idx);

        // 먼저 documentIdx(전자결재 문서 ID)로 조회 시도
        Optional<ReceiptTrip> entityByDocumentIdx = receiptTripRepository.findByDocumentIdx(idx);
        if (entityByDocumentIdx.isPresent()) {
            log.debug("documentIdx로 출장 조회 성공 - documentIdx: {}", idx);
            ReceiptTrip entity = receiptTripRepository.findByIdWithDetails(entityByDocumentIdx.get().getIdx())
                    .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));
            if (Boolean.TRUE.equals(entity.getDeleted())) {
                throw new IllegalArgumentException("삭제된 출장입니다. idx: " + idx);
            }
            entity.setAttendees(receiptAttendeeRepository.findByReceiptTripIdx(entity.getIdx()));
            entity.setDailyExpenses(dailyExpenseRepository.findByReceiptTripIdxOrderByExpenseDateAsc(entity.getIdx()));
            entity.setAttachments(attachmentRepository.findByReceiptTripIdxAndDeletedFalseOrderByIdxAsc(entity.getIdx()));
            return mapper.toDTO(entity);
        }

        // receipt_trip.idx로 직접 조회
        ReceiptTrip entity = receiptTripRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 출장입니다. idx: " + idx);
        }
        entity.setAttendees(receiptAttendeeRepository.findByReceiptTripIdx(idx));
        entity.setDailyExpenses(dailyExpenseRepository.findByReceiptTripIdxOrderByExpenseDateAsc(idx));
        entity.setAttachments(attachmentRepository.findByReceiptTripIdxAndDeletedFalseOrderByIdxAsc(idx));
        return mapper.toDTO(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getReceiptTripsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 출장 목록 조회 - projectIdx: {}", projectIdx);
        return receiptTripRepository.findByProjectIdxOrderByTripDateDesc(projectIdx)
                .stream().map(mapper::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getReceiptTripsByAuthorIdx(Long drafterUserIdx) {
        log.debug("작성자별 출장 목록 조회 - drafterUserIdx: {}", drafterUserIdx);
        return receiptTripRepository.findByDrafterUserIdxOrderByTripDateDesc(drafterUserIdx)
                .stream().map(mapper::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripDTO> getReceiptTripsByStatus(String status) {
        log.debug("상태별 출장 목록 조회 - status: {}", status);
        return receiptTripRepository.findByStatusOrderByTripDateDesc(status)
                .stream().map(mapper::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReceiptTripDTO createReceiptTrip(ReceiptTripCreateDTO createDTO, Long currentUserIdx) {
        log.debug("출장 생성 - projectIdx: {}, drafterUserIdx: {}, currentUserIdx: {}",
                createDTO.getProjectIdx(), createDTO.getDrafterUserIdx(), currentUserIdx);

        try {
            // 1. 문서번호 생성
            String documentNo = generateDocumentNo();

            String title = "연구비증빙 단독출장";
            if (createDTO.getLocation() != null && !createDTO.getLocation().isEmpty()) {
                title = "연구비증빙 단독출장 - " + createDTO.getLocation();
            }

            // 2. ApprovalDocument 생성
            //    drafterUserIdx = 화면에서 선택한 작성자 (대리 입력 시 로그인 유저와 다름)
            //    createdUserIdx = 실제 로그인한 저장자
            ApprovalDocument approvalDocument = ApprovalDocument.builder()
                    .documentNo(documentNo)
                    .title(title)
                    .documentType("연구비증빙-단독출장")
                    .isProject(true)
                    .drafterUserIdx(createDTO.getDrafterUserIdx())
                    .content(createDTO.getContent())
                    .createdUserIdx(currentUserIdx)
                    .updatedUserIdx(currentUserIdx)
                    .build();
            ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument 생성 - idx: {}, documentNo: {}", savedDocument.getIdx(), documentNo);

            // 3. ReceiptTrip Entity 생성 및 저장
            ReceiptTrip entity = mapper.toEntity(createDTO);
            // dailyExpenses가 있으면 totalFee를 일별 합산으로 재계산
            List<ReceiptTripDailyExpenseDTO> dailyList =
                    createDTO.getDailyExpenses() != null ? createDTO.getDailyExpenses() : Collections.emptyList();
            if (!dailyList.isEmpty()) {
                BigDecimal totalFee = dailyList.stream()
                        .map(d -> orZero(d.getTransportationFee())
                                .add(orZero(d.getAccommodationFee()))
                                .add(orZero(d.getMealFee()))
                                .add(orZero(d.getOtherFee())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                entity.setTotalFee(totalFee);
            }
            entity.setDocumentIdx(savedDocument.getIdx());
            entity.setDocumentNumber(documentNo);
            entity.setCreatedUserIdx(currentUserIdx);
            entity.setUpdatedUserIdx(currentUserIdx);
            entity = receiptTripRepository.save(entity);

            // 4. 일별 비용 명세 저장
            if (!dailyList.isEmpty()) {
                final Long tripIdx = entity.getIdx();
                List<ReceiptTripDailyExpense> dailyEntities = dailyList.stream()
                        .map(d -> mapper.toDailyExpenseEntity(d, tripIdx))
                        .collect(Collectors.toList());
                dailyExpenseRepository.saveAll(dailyEntities);
                log.debug("일별 비용 {}일분 저장 완료 - tripIdx: {}", dailyEntities.size(), tripIdx);
            }

            // 5. 참석자 저장 (receipt_attendee 통합 테이블, prefix=RCT)
            if (createDTO.getAttendees() != null && !createDTO.getAttendees().isEmpty()) {
                final ReceiptTrip savedTrip = entity;
                List<ReceiptAttendee> attendees = createDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, savedTrip, currentUserIdx))
                        .collect(Collectors.toList());
                receiptAttendeeRepository.saveAll(attendees);
            }

            // 6. 재조회 후 참석자 + 일별 비용 주입
            ReceiptTrip saved = receiptTripRepository.findByIdWithDetails(entity.getIdx())
                    .orElseThrow(() -> new IllegalStateException("저장된 출장 정보를 조회할 수 없습니다."));
            saved.setAttendees(receiptAttendeeRepository.findByReceiptTripIdx(saved.getIdx()));
            saved.setDailyExpenses(dailyExpenseRepository.findByReceiptTripIdxOrderByExpenseDateAsc(saved.getIdx()));

            log.info("출장 생성 완료 - idx: {}, documentNo: {}", saved.getIdx(), documentNo);
            return mapper.toDTO(saved);

        } catch (Exception e) {
            log.error("출장 생성 실패 - projectIdx: {}, error: {}", createDTO.getProjectIdx(), e.getMessage(), e);
            throw new RuntimeException("출장 저장 중 오류가 발생했습니다.", e);
        }
    }

    @Override
    @Transactional
    public ReceiptTripDTO updateReceiptTrip(Long idx, ReceiptTripUpdateDTO updateDTO, Long currentUserIdx) {
        log.debug("출장 수정 - idx: {}, currentUserIdx: {}", idx, currentUserIdx);

        ReceiptTrip entity = receiptTripRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));
        if (Boolean.TRUE.equals(entity.getDeleted())) {
            throw new IllegalArgumentException("삭제된 출장입니다. idx: " + idx);
        }

        mapper.updateEntity(entity, updateDTO);

        // dailyExpenses가 있으면 totalFee를 일별 합산으로 재계산
        List<ReceiptTripDailyExpenseDTO> dailyList =
                updateDTO.getDailyExpenses() != null ? updateDTO.getDailyExpenses() : Collections.emptyList();
        if (!dailyList.isEmpty()) {
            BigDecimal totalFee = dailyList.stream()
                    .map(d -> orZero(d.getTransportationFee())
                            .add(orZero(d.getAccommodationFee()))
                            .add(orZero(d.getMealFee()))
                            .add(orZero(d.getOtherFee())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            entity.setTotalFee(totalFee);
        }

        entity.setUpdatedUserIdx(currentUserIdx);
        entity = receiptTripRepository.save(entity);

        // ApprovalDocument 업데이트 (title, drafterUserIdx, content 동기화)
        final ReceiptTrip updatedTripEntity = entity;
        if (updatedTripEntity.getDocumentIdx() != null) {
            final String newTitle = (updatedTripEntity.getLocation() != null && !updatedTripEntity.getLocation().isEmpty())
                    ? "연구비증빙 단독출장 - " + updatedTripEntity.getLocation()
                    : "연구비증빙 단독출장";
            approvalDocumentRepository.findById(updatedTripEntity.getDocumentIdx()).ifPresent(doc -> {
                doc.setTitle(newTitle);
                if (updateDTO.getDrafterUserIdx() != null) {
                    doc.setDrafterUserIdx(updateDTO.getDrafterUserIdx());
                }
                doc.setContent(updatedTripEntity.getContent());
                doc.setUpdatedUserIdx(currentUserIdx);
                approvalDocumentRepository.save(doc);
                log.debug("ApprovalDocument 업데이트 완료 - documentIdx: {}", updatedTripEntity.getDocumentIdx());
            });
        }

        // 일별 비용 명세 재생성 (물리 삭제 후 재삽입)
        if (updateDTO.getDailyExpenses() != null) {
            dailyExpenseRepository.deleteByReceiptTripIdx(idx);
            if (!dailyList.isEmpty()) {
                final Long tripIdx = entity.getIdx();
                List<ReceiptTripDailyExpense> dailyEntities = dailyList.stream()
                        .map(d -> mapper.toDailyExpenseEntity(d, tripIdx))
                        .collect(Collectors.toList());
                dailyExpenseRepository.saveAll(dailyEntities);
                log.debug("일별 비용 {}일분 재저장 완료 - tripIdx: {}", dailyEntities.size(), tripIdx);
            }
        }

        // 참석자 재생성 (receipt_attendee 통합 테이블, prefix=RCT, 소프트 딜리트 후 재삽입)
        if (updateDTO.getAttendees() != null) {
            receiptAttendeeRepository.softDeleteByReceiptIdxAndDocumentTypePrefix(idx, "RCT", currentUserIdx);
            if (!updateDTO.getAttendees().isEmpty()) {
                final ReceiptTrip savedEntity = entity;
                List<ReceiptAttendee> attendees = updateDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, savedEntity, currentUserIdx))
                        .collect(Collectors.toList());
                receiptAttendeeRepository.saveAll(attendees);
            }
        }

        // 첨부파일 파일명 재정렬
        renameAttachments(entity);

        ReceiptTrip updated = receiptTripRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalStateException("수정된 출장 정보를 조회할 수 없습니다."));
        updated.setAttendees(receiptAttendeeRepository.findByReceiptTripIdx(idx));
        updated.setDailyExpenses(dailyExpenseRepository.findByReceiptTripIdxOrderByExpenseDateAsc(idx));

        log.info("출장 수정 완료 - idx: {}", idx);
        return mapper.toDTO(updated);
    }

    @Override
    @Transactional
    public void deleteReceiptTrip(Long idx, Long deletedUserIdx) {
        log.debug("출장 소프트 딜리트 - idx: {}", idx);

        ReceiptTrip entity = receiptTripRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("출장 정보를 찾을 수 없습니다. idx: " + idx));

        LocalDateTime now = LocalDateTime.now();

        // 1. 일별 비용 명세 물리 삭제
        dailyExpenseRepository.deleteByReceiptTripIdx(idx);
        log.debug("ReceiptTripDailyExpense 삭제 완료 - receiptTripIdx: {}", idx);

        // 2. 참석자 소프트 딜리트 (receipt_attendee 통합 테이블, prefix=RCT)
        receiptAttendeeRepository.softDeleteByReceiptIdxAndDocumentTypePrefix(idx, PREFIX, deletedUserIdx);
        log.debug("ReceiptAttendee 소프트 딜리트 완료 - receiptTripIdx: {}", idx);

        // 3. 첨부파일 소프트 딜리트
        attachmentRepository.softDeleteByReceiptTripIdx(idx, deletedUserIdx);
        log.debug("ReceiptTripAttachment 소프트 딜리트 완료 - receiptTripIdx: {}", idx);

        // 4. ReceiptTrip 소프트 딜리트
        entity.setDeleted(true);
        entity.setDeletedAt(now);
        entity.setDeletedUserIdx(deletedUserIdx);
        receiptTripRepository.save(entity);

        // 5. ApprovalDocument 소프트 딜리트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(doc -> {
                doc.setDeletedAt(now);
                doc.setDeletedUserIdx(deletedUserIdx);
                approvalDocumentRepository.save(doc);
                log.debug("ApprovalDocument 소프트 딜리트 - idx: {}", entity.getDocumentIdx());
            });
        }

        log.info("출장 소프트 딜리트 완료 - idx: {}", idx);
    }

    // ══════════════════════════════════════════════════════════════
    // 첨부파일
    // ══════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public List<ReceiptTripAttachmentDTO> saveAttachments(Long receiptTripIdx,
                                                           MultipartFile[] files,
                                                           String attachmentType,
                                                           Long uploadUserIdx) {
        log.debug("첨부파일 저장 - receiptTripIdx: {}, type: {}, 개수: {}",
                receiptTripIdx, attachmentType, files != null ? files.length : 0);

        if (files == null || files.length == 0) return Collections.emptyList();

        ReceiptTrip trip = receiptTripRepository.findById(receiptTripIdx)
                .orElseThrow(() -> new IllegalArgumentException("출장을 찾을 수 없습니다. idx: " + receiptTripIdx));

        // 카드번호 조회
        String cardLastDigits = "no-card";
        if (trip.getCardIdx() != null) {
            var card = projectCardRepository.findById(trip.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }

        // 업로드 경로 구성
        String year  = String.valueOf(trip.getTripDate().getYear());
        String date  = trip.getTripDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String relativePath = uploadPattern
                .replace("{projectIdx}", String.valueOf(trip.getProjectIdx()))
                .replace("{cardLastDigits}", cardLastDigits)
                .replace("{year}", year)
                .replace("{date}", date);
        String fullUploadPath = baseDir + File.separator + relativePath.replace("/", File.separator);

        try {
            Files.createDirectories(Paths.get(fullUploadPath));
        } catch (IOException e) {
            log.error("업로드 디렉토리 생성 실패: {}", fullUploadPath, e);
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다: " + fullUploadPath, e);
        }

        // 표시용 파일명 기본 구성: {카드번호}_{yyyymmdd}_{총금액}_{출장}_{문서종류}
        String displayDateStr   = trip.getTripDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        BigDecimal totalAmount  = calcTotal(trip);
        String displayAmountStr = String.format("%,d원", totalAmount.longValue());
        String displayDocType   = "DOCUMENT".equals(attachmentType) ? "공식문서" : "영수증";
        String displayBaseName  = cardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_출장_" + displayDocType;

        // 기존 파일 수 → 연번 오프셋
        long existingCount = attachmentRepository
                .countByReceiptTripIdxAndAttachmentTypeAndDeletedFalse(receiptTripIdx, attachmentType);

        List<ReceiptTripAttachmentDTO> saved = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            try {
                String actualName = file.getOriginalFilename();
                if (actualName == null) actualName = "unnamed_file";
                String extension = "";
                int dot = actualName.lastIndexOf('.');
                if (dot > 0) extension = actualName.substring(dot);

                long seq = existingCount + saved.size() + 1;
                String displayFilename = displayBaseName + "_" + seq + extension;

                String timestamp      = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid           = UUID.randomUUID().toString().substring(0, 8);
                String storedFilename = timestamp + "_" + uuid + extension;

                Path filePath = Paths.get(fullUploadPath, storedFilename);
                Files.copy(file.getInputStream(), filePath);

                ReceiptTripAttachment attachment = ReceiptTripAttachment.builder()
                        .receiptTripIdx(receiptTripIdx)
                        .originalFilename(displayFilename)
                        .storedFilename(storedFilename)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();

                ReceiptTripAttachment savedAtt = attachmentRepository.save(attachment);
                saved.add(mapper.toAttachmentDTO(savedAtt));
                log.debug("첨부파일 저장 완료 - idx: {}, filename: {}", savedAtt.getIdx(), displayFilename);

            } catch (IOException e) {
                log.error("파일 저장 실패: {}", file.getOriginalFilename(), e);
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptTripAttachmentDTO> getAttachmentsByReceiptTripIdx(Long receiptTripIdx) {
        return attachmentRepository
                .findByReceiptTripIdxAndDeletedFalseOrderByIdxAsc(receiptTripIdx)
                .stream().map(mapper::toAttachmentDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptTripAttachmentDTO getAttachmentById(Long attachmentIdx) {
        ReceiptTripAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
        return mapper.toAttachmentDTO(attachment);
    }

    @Override
    @Transactional
    public void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx) {
        log.debug("첨부파일 소프트 딜리트 - idx: {}", attachmentIdx);
        ReceiptTripAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
        attachment.setDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now());
        attachment.setDeletedUserIdx(deletedUserIdx);
        attachmentRepository.save(attachment);
    }

    // ══════════════════════════════════════════════════════════════
    // 내부 헬퍼
    // ══════════════════════════════════════════════════════════════

    /**
     * 수정 시 첨부파일 originalFilename 재정렬
     * 타입별로 그룹화한 뒤 idx 오름차순으로 _1, _2... 재부여
     */
    private void renameAttachments(ReceiptTrip trip) {
        List<ReceiptTripAttachment> all = attachmentRepository
                .findByReceiptTripIdxOrderByIdxAsc(trip.getIdx());

        String cardLastDigits = "no-card";
        if (trip.getCardIdx() != null) {
            var card = projectCardRepository.findById(trip.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }
        String displayDateStr   = trip.getTripDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        BigDecimal totalAmount  = calcTotal(trip);
        String displayAmountStr = String.format("%,d원", totalAmount.longValue());
        final String finalCardLastDigits = cardLastDigits;

        Map<String, List<ReceiptTripAttachment>> byType = all.stream()
                .filter(a -> !Boolean.TRUE.equals(a.getDeleted()))
                .collect(Collectors.groupingBy(
                        a -> a.getAttachmentType() != null ? a.getAttachmentType() : "RECEIPT",
                        Collectors.toList()
                ));

        byType.forEach((type, list) -> {
            String displayDocType = "DOCUMENT".equals(type) ? "공식문서" : "영수증";
            String baseName = finalCardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_출장_" + displayDocType;

            list.sort(Comparator.comparing(ReceiptTripAttachment::getIdx));
            for (int i = 0; i < list.size(); i++) {
                ReceiptTripAttachment att = list.get(i);
                String storedName = att.getStoredFilename();
                String extension = "";
                if (storedName != null) {
                    int dot = storedName.lastIndexOf('.');
                    if (dot > 0) extension = storedName.substring(dot);
                }
                att.setOriginalFilename(baseName + "_" + (i + 1) + extension);
                attachmentRepository.save(att);
            }
        });
    }

    private BigDecimal calcTotal(ReceiptTrip trip) {
        return trip.getTotalFee() != null ? trip.getTotalFee() : BigDecimal.ZERO;
    }

    private BigDecimal orZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String generateDocumentNo() {
        int currentYear = LocalDateTime.now().getYear();
        DocumentSequence sequence = documentSequenceRepository
                .findByDocumentTypeAndYear(DOCUMENT_TYPE, currentYear)
                .orElseGet(() -> {
                    DocumentSequence s = DocumentSequence.builder()
                            .documentType(DOCUMENT_TYPE)
                            .prefix(PREFIX)
                            .year(currentYear)
                            .lastNumber(0)
                            .currentSequence(0)
                            .createdAt(LocalDateTime.now())
                            .build();
                    return documentSequenceRepository.save(s);
                });
        sequence.setLastNumber(sequence.getLastNumber() + 1);
        sequence.setUpdatedAt(LocalDateTime.now());
        documentSequenceRepository.save(sequence);
        return String.format("%s-%d-%04d", sequence.getPrefix(), sequence.getYear(), sequence.getLastNumber());
    }

}
