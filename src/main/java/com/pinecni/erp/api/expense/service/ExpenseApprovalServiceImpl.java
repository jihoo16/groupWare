package com.pinecni.erp.api.expense.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.expense.dto.AdminExpenseDocumentDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalAttachmentDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.api.expense.dto.ExpenseDetailDTO;
import com.pinecni.erp.api.expense.repository.ExpenseApprovalAttachmentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.ExpenseApproval;
import com.pinecni.erp.entity.ExpenseApprovalAttachment;
import com.pinecni.erp.entity.ExpenseDetail;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.api.expense.repository.ExpenseApprovalRepository;
import com.pinecni.erp.api.expense.repository.ExpenseDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.pinecni.erp.constant.CodeConstants;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ExpenseApprovalServiceImpl implements ExpenseApprovalService {

    private static final CodeConstants.DocumentType DOC_TYPE = CodeConstants.DocumentType.EXPENSE_APPROVAL;
    private static final Set<String> ALLOWED_PAYMENT_METHODS = Set.of("개인카드", "현금");

    private final ExpenseApprovalRepository expenseApprovalRepository;
    private final ExpenseDetailRepository expenseDetailRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final ExpenseApprovalAttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.storage.expense.pattern:documents/expense/{userId}/{year}}")
    private String uploadPattern;

    @Override
    public ExpenseApproval createExpenseApproval(ExpenseApprovalCreateDTO createDTO) {
        Long loginUserIdx = createDTO.getUserIdx();
        log.info("지출승인서 생성 시작 - 사용자: {}", loginUserIdx);

        validateExpenseDetails(createDTO.getExpenseDetails());

        // 1. 문서번호 채번
        String documentNo = documentSequenceService.generateDocumentNumber(DOC_TYPE.getCode(), DOC_TYPE.getPrefix(), loginUserIdx);

        // 3. total_amount 계산 (approval_documents.content에도 기록하기 위해 먼저)
        long totalAmount = createDTO.getExpenseDetails().stream()
                .mapToLong(ExpenseDetailDTO::getAmount)
                .sum();

        // 2. approval_documents 저장 (정산월 기준 제목: 14일 이상 → 다음달, 13일 이하 → 당월)
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        int settlementMonth = today.getDayOfMonth() >= 14
                ? today.plusMonths(1).getMonthValue()
                : today.getMonthValue();
        String title = DOC_TYPE.getName() + " - " + settlementMonth + "월";

        ApprovalDocument doc = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType(DOC_TYPE.getCode())
                .content("총 지출금액: ₩" + String.format("%,d", totalAmount))
                .isProject(false)
                .drafterUserIdx(loginUserIdx)
                .createdUserIdx(loginUserIdx)
                .updatedUserIdx(loginUserIdx)
                .build();
        doc = approvalDocumentRepository.save(doc);
        log.debug("approval_documents 저장 완료 - idx: {}, documentNo: {}", doc.getIdx(), documentNo);

        // 4. ExpenseApproval 저장
        ExpenseApproval expenseApproval = ExpenseApproval.builder()
                .userIdx(loginUserIdx)
                .totalAmount(totalAmount)
                .documentIdx(doc.getIdx())
                .documentNumber(documentNo)
                .createdUserIdx(loginUserIdx)
                .updatedUserIdx(loginUserIdx)
                .build();
        expenseApproval = expenseApprovalRepository.save(expenseApproval);

        // 5. ExpenseDetail 저장
        final Long approvalIdx = expenseApproval.getIdx();
        List<ExpenseDetail> details = buildDetails(createDTO.getExpenseDetails(), approvalIdx, loginUserIdx);
        expenseDetailRepository.saveAll(details);

        log.info("지출승인서 생성 완료 - idx: {}, documentNo: {}, 총 금액: {}, 항목 수: {}",
                expenseApproval.getIdx(), documentNo, totalAmount, details.size());

        return expenseApproval;
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseApproval getExpenseApprovalWithDetails(Long idx) {
        log.info("지출승인서 상세 조회 - idx: {}", idx);
        return expenseApprovalRepository.findByIdxWithDetails(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출승인서를 찾을 수 없습니다. idx: " + idx));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseApproval> getExpenseApprovalsByUser(Long userIdx) {
        log.info("지출승인서 목록 조회 - userIdx: {}", userIdx);
        return expenseApprovalRepository.findByUserIdxAndDeletedFalseOrderByCreatedAtDesc(userIdx);
    }

    @Override
    public ExpenseApproval updateExpenseApproval(Long idx, ExpenseApprovalCreateDTO updateDTO, Long loginUserIdx) {
        log.info("지출승인서 수정 시작 - idx: {}, userIdx: {}", idx, loginUserIdx);

        ExpenseApproval expenseApproval = expenseApprovalRepository.findByIdxWithDetails(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출승인서를 찾을 수 없습니다. idx: " + idx));

        if (!expenseApproval.getUserIdx().equals(loginUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 수정할 수 있습니다.");
        }

        validateExpenseDetails(updateDTO.getExpenseDetails());

        // 기존 항목을 idx 오름차순으로 정렬
        List<ExpenseDetail> existingDetails = expenseDetailRepository
                .findByExpenseApprovalIdxOrderByIdxAsc(idx);
        List<ExpenseDetailDTO> newDTOs = updateDTO.getExpenseDetails();

        int existingSize = existingDetails.size();
        int newSize = newDTOs.size();

        // 1) 겹치는 구간: 기존 항목 업데이트 (idx 유지 → 영수증 연결 그대로)
        for (int i = 0; i < Math.min(existingSize, newSize); i++) {
            ExpenseDetail existing = existingDetails.get(i);
            ExpenseDetailDTO dto = newDTOs.get(i);

            // 날짜 또는 적요 변경 여부 체크 → 영수증 표시명 갱신 필요
            boolean nameChanged = !existing.getExpenseDate().equals(dto.getExpenseDate())
                    || !String.valueOf(existing.getDescription()).equals(String.valueOf(dto.getDescription()));

            existing.setExpenseDate(dto.getExpenseDate());
            existing.setDescription(dto.getDescription());
            existing.setShopName(dto.getShopName());
            existing.setPaymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : "개인카드");
            existing.setAmount(dto.getAmount());
            existing.setNote(dto.getNote());
            existing.setUpdatedUserIdx(loginUserIdx);

            if (nameChanged) {
                renameItemReceiptAttachments(existing);
            }
        }

        // 2) 새 항목이 더 많으면: 추가 삽입
        if (newSize > existingSize) {
            for (int i = existingSize; i < newSize; i++) {
                ExpenseDetailDTO dto = newDTOs.get(i);
                ExpenseDetail newDetail = ExpenseDetail.builder()
                        .expenseApprovalIdx(idx)
                        .expenseDate(dto.getExpenseDate())
                        .description(dto.getDescription())
                        .shopName(dto.getShopName())
                        .paymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : "개인카드")
                        .amount(dto.getAmount())
                        .note(dto.getNote())
                        .createdUserIdx(loginUserIdx)
                        .updatedUserIdx(loginUserIdx)
                        .build();
                expenseDetailRepository.save(newDetail);
            }
        }

        // 3) 기존 항목이 더 많으면: 초과분 삭제 + 해당 영수증 soft delete
        if (existingSize > newSize) {
            for (int i = newSize; i < existingSize; i++) {
                ExpenseDetail toRemove = existingDetails.get(i);
                // 해당 항목의 영수증 soft delete
                List<ExpenseApprovalAttachment> itemAtts = attachmentRepository
                        .findByExpenseDetailIdxAndDeletedFalseOrderByIdxAsc(toRemove.getIdx());
                for (ExpenseApprovalAttachment att : itemAtts) {
                    att.setDeleted(true);
                    att.setDeletedAt(LocalDateTime.now());
                    att.setDeletedUserIdx(loginUserIdx);
                    attachmentRepository.save(att);
                }
                expenseDetailRepository.delete(toRemove);
            }
        }

        // total_amount 재계산
        long totalAmount = newDTOs.stream().mapToLong(ExpenseDetailDTO::getAmount).sum();
        expenseApproval.setTotalAmount(totalAmount);
        expenseApproval.setUpdatedUserIdx(loginUserIdx);

        // 수정 시 정산상태를 '작성중'(C1001)으로 되돌림
        expenseApproval.setSettlementStatus("C1001");
        expenseApproval.setSettlementComment(null);
        expenseApproval.setSettlementStatusUpdatedAt(LocalDateTime.now());
        expenseApproval.setSettlementStatusUpdatedBy(loginUserIdx);

        // approval_documents 수정자 + content(금액) 업데이트
        final long finalTotalAmount = totalAmount;
        if (expenseApproval.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(expenseApproval.getDocumentIdx()).ifPresent(doc -> {
                doc.setUpdatedUserIdx(loginUserIdx);
                doc.setContent("총 지출금액: ₩" + String.format("%,d", finalTotalAmount));
                approvalDocumentRepository.save(doc);
            });
        }

        log.info("지출승인서 수정 완료 - idx: {}, 총 금액: {}, 항목 수: {}",
                idx, totalAmount, newSize);

        return expenseApproval;
    }

    @Override
    public void deleteExpenseApproval(Long idx, Long loginUserIdx) {
        log.info("지출승인서 삭제 시작 - idx: {}, userIdx: {}", idx, loginUserIdx);

        ExpenseApproval expenseApproval = expenseApprovalRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출승인서를 찾을 수 없습니다. idx: " + idx));

        if (Boolean.TRUE.equals(expenseApproval.getDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "지출승인서를 찾을 수 없습니다. idx: " + idx);
        }

        // 본인 문서 검증
        if (!expenseApproval.getUserIdx().equals(loginUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 삭제할 수 있습니다.");
        }

        // soft delete
        expenseApproval.softDelete(loginUserIdx);
        expenseApprovalRepository.save(expenseApproval);

        // approval_documents soft delete
        if (expenseApproval.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(expenseApproval.getDocumentIdx()).ifPresent(doc -> {
                doc.setDeletedAt(LocalDateTime.now());
                doc.setDeletedUserIdx(loginUserIdx);
                approvalDocumentRepository.save(doc);
            });
        }

        // 첨부파일 소프트 딜리트
        attachmentRepository.softDeleteByExpenseApprovalIdx(idx, loginUserIdx);

        log.info("지출승인서 삭제 완료 - idx: {}", idx);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkCurrentPeriod(Long userIdx) {
        // 기간 계산: 당일이 13일 이하이면 전월 14일 ~ 당월 13일, 14일 이상이면 당월 14일 ~ 익월 13일
        LocalDate today = LocalDate.now();
        LocalDate periodStart;
        LocalDate periodEnd;

        if (today.getDayOfMonth() <= 13) {
            periodStart = today.minusMonths(1).withDayOfMonth(14);
            periodEnd   = today.withDayOfMonth(13);
        } else {
            periodStart = today.withDayOfMonth(14);
            periodEnd   = today.plusMonths(1).withDayOfMonth(13);
        }

        List<ExpenseApproval> found = expenseApprovalRepository.findByUserIdxAndPeriod(
                userIdx,
                periodStart.atStartOfDay(),
                periodEnd.atTime(23, 59, 59));

        Map<String, Object> result = new HashMap<>();
        if (found.isEmpty()) {
            result.put("exists", false);
        } else {
            ExpenseApproval doc = found.get(0);
            result.put("exists", true);
            result.put("documentIdx", doc.getIdx());
            result.put("documentNumber", doc.getDocumentNumber());
            result.put("periodStart", periodStart.toString());
            result.put("periodEnd", periodEnd.toString());
        }
        return result;
    }

    @Override
    @Transactional
    public List<ExpenseApprovalAttachmentDTO> saveAttachments(Long expenseApprovalIdx, MultipartFile[] files,
                                                              String attachmentType, Long uploadUserIdx) {
        log.debug("첨부파일 저장 - expenseApprovalIdx: {}, 파일 개수: {}, type: {}",
                expenseApprovalIdx, files != null ? files.length : 0, attachmentType);

        if (files == null || files.length == 0) return Collections.emptyList();

        ExpenseApproval approval = expenseApprovalRepository.findById(expenseApprovalIdx)
                .orElseThrow(() -> new IllegalArgumentException("지출승인서를 찾을 수 없습니다. idx: " + expenseApprovalIdx));

        String year = String.valueOf(approval.getCreatedAt() != null
                ? approval.getCreatedAt().getYear()
                : LocalDateTime.now().getYear());
        String relativePath = uploadPattern
                .replace("{userId}", String.valueOf(approval.getUserIdx()))
                .replace("{year}", year);
        String fullUploadPath = baseDir + File.separator + relativePath.replace("/", File.separator);

        try {
            Files.createDirectories(Paths.get(fullUploadPath));
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다: " + fullUploadPath, e);
        }

        String month = approval.getCreatedAt() != null
                ? approval.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyyMM"))
                : LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String docTypeLabel = "DOCUMENT".equals(attachmentType) ? "공식문서" : "영수증";
        String displayBase = "지출승인서_" + month + "_" + docTypeLabel;

        long existingCount = attachmentRepository
                .countByExpenseApprovalIdxAndAttachmentTypeAndDeletedFalse(expenseApprovalIdx, attachmentType);

        List<ExpenseApprovalAttachmentDTO> saved = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                String original = file.getOriginalFilename();
                if (original == null) original = "unnamed";
                String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : "";

                long seq = existingCount + saved.size() + 1;
                String displayFilename = displayBase + "_" + seq + ext;

                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                String storedFilename = timestamp + "_" + uuid + ext;

                Files.copy(file.getInputStream(), Paths.get(fullUploadPath, storedFilename));

                ExpenseApprovalAttachment attachment = ExpenseApprovalAttachment.builder()
                        .expenseApprovalIdx(expenseApprovalIdx)
                        .originalFilename(displayFilename)
                        .storedFilename(storedFilename)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();

                ExpenseApprovalAttachment result = attachmentRepository.save(attachment);
                saved.add(toAttachmentDTO(result));

                log.debug("첨부파일 저장 완료 - 표시명: {}, 저장명: {}", displayFilename, storedFilename);
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseApprovalAttachmentDTO> getAttachments(Long expenseApprovalIdx) {
        return attachmentRepository
                .findByExpenseApprovalIdxAndDeletedFalseOrderByIdxAsc(expenseApprovalIdx)
                .stream().map(this::toAttachmentDTO).toList();
    }

    @Override
    @Transactional
    public void deleteAttachment(Long attachmentIdx, Long deletedUserIdx) {
        ExpenseApprovalAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
        attachment.setDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")));
        attachment.setDeletedUserIdx(deletedUserIdx);
        attachmentRepository.save(attachment);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseApprovalAttachmentDTO getAttachmentById(Long attachmentIdx) {
        return attachmentRepository.findById(attachmentIdx)
                .map(this::toAttachmentDTO)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
    }

    @Override
    @Transactional
    public List<ExpenseApprovalAttachmentDTO> saveItemAttachments(
            Long expenseApprovalIdx, Long expenseDetailIdx,
            MultipartFile[] files, Long uploadUserIdx) {
        log.debug("항목별 영수증 저장 - approvalIdx: {}, detailIdx: {}, 파일 수: {}",
                expenseApprovalIdx, expenseDetailIdx, files != null ? files.length : 0);

        if (files == null || files.length == 0) return Collections.emptyList();

        ExpenseApproval approval = expenseApprovalRepository.findById(expenseApprovalIdx)
                .orElseThrow(() -> new IllegalArgumentException("지출승인서를 찾을 수 없습니다. idx: " + expenseApprovalIdx));

        String year = String.valueOf(approval.getCreatedAt() != null
                ? approval.getCreatedAt().getYear()
                : LocalDateTime.now().getYear());
        String relativePath = uploadPattern
                .replace("{userId}", String.valueOf(approval.getUserIdx()))
                .replace("{year}", year);
        String fullUploadPath = baseDir + File.separator + relativePath.replace("/", File.separator);

        try {
            Files.createDirectories(Paths.get(fullUploadPath));
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다: " + fullUploadPath, e);
        }

        // 항목의 날짜+적요로 표시명 생성 (예: 지출승인서_20260302_야근식대_1.pdf)
        ExpenseDetail detail = expenseDetailRepository.findById(expenseDetailIdx)
                .orElseThrow(() -> new IllegalArgumentException("지출 항목을 찾을 수 없습니다. idx: " + expenseDetailIdx));
        String dateStr = detail.getExpenseDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String desc = detail.getDescription() != null ? detail.getDescription() : "영수증";
        String displayBase = "지출승인서_" + dateStr + "_" + desc;

        long existingCount = attachmentRepository
                .countByExpenseDetailIdxAndDeletedFalse(expenseDetailIdx);

        List<ExpenseApprovalAttachmentDTO> saved = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                String original = file.getOriginalFilename();
                if (original == null) original = "unnamed";
                String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : "";

                long seq = existingCount + saved.size() + 1;
                String displayFilename = displayBase + "_" + seq + ext;

                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                String storedFilename = timestamp + "_" + uuid + ext;

                Files.copy(file.getInputStream(), Paths.get(fullUploadPath, storedFilename));

                ExpenseApprovalAttachment attachment = ExpenseApprovalAttachment.builder()
                        .expenseApprovalIdx(expenseApprovalIdx)
                        .expenseDetailIdx(expenseDetailIdx)
                        .originalFilename(displayFilename)
                        .storedFilename(storedFilename)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType("ITEM_RECEIPT")
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();

                ExpenseApprovalAttachment result = attachmentRepository.save(attachment);
                saved.add(toAttachmentDTO(result));

                log.debug("항목별 영수증 저장 완료 - detailIdx: {}, 표시명: {}", expenseDetailIdx, displayFilename);
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseApprovalAttachmentDTO> getItemAttachments(Long expenseDetailIdx) {
        return attachmentRepository
                .findByExpenseDetailIdxAndDeletedFalseOrderByIdxAsc(expenseDetailIdx)
                .stream().map(this::toAttachmentDTO).toList();
    }

    private ExpenseApprovalAttachmentDTO toAttachmentDTO(ExpenseApprovalAttachment e) {
        return ExpenseApprovalAttachmentDTO.builder()
                .idx(e.getIdx())
                .expenseApprovalIdx(e.getExpenseApprovalIdx())
                .expenseDetailIdx(e.getExpenseDetailIdx())
                .originalFilename(e.getOriginalFilename())
                .storedFilename(e.getStoredFilename())
                .filePath(e.getFilePath())
                .fileSize(e.getFileSize())
                .fileType(e.getFileType())
                .attachmentType(e.getAttachmentType())
                .uploadUserIdx(e.getUploadUserIdx())
                .deleted(e.getDeleted())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    // ── 관리자 전용 ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AdminExpenseDocumentDTO> getAllExpenseDocumentsForAdmin() {
        log.info("관리자 - 전체 개인경비청구 문서 조회");

        List<ExpenseApproval> all = expenseApprovalRepository.findAllOrderByCreatedAtDesc();

        // 사용자 정보 일괄 조회 (N+1 방지)
        List<Long> userIdxList = all.stream().map(ExpenseApproval::getUserIdx).distinct().toList();
        Map<Long, User> userMap = new HashMap<>();
        userRepository.findAllById(userIdxList).forEach(u -> userMap.put(u.getIdx(), u));

        // 코드명 캐시 (부서/직급)
        Map<String, String> codeNameCache = new HashMap<>();

        return all.stream().map(ea -> {
            User user = userMap.get(ea.getUserIdx());

            String deptName = "-";
            String posName = "-";
            if (user != null) {
                deptName = codeNameCache.computeIfAbsent(user.getEmpDept(),
                        code -> codeRepository.findByCode(code).map(Code::getCodeName).orElse(code));
                posName = codeNameCache.computeIfAbsent(user.getEmpPosition(),
                        code -> codeRepository.findByCode(code).map(Code::getCodeName).orElse(code));
            }

            // 항목 수
            List<ExpenseDetail> details = expenseDetailRepository
                    .findByExpenseApprovalIdxOrderByIdxAsc(ea.getIdx());
            int detailCount = details.size();

            // 항목별 영수증 첨부 현황
            int receiptAttachedCount = 0;
            for (ExpenseDetail d : details) {
                long attCount = attachmentRepository.countByExpenseDetailIdxAndDeletedFalse(d.getIdx());
                if (attCount > 0) receiptAttachedCount++;
            }

            // 서명완료 공식문서 첨부 여부
            boolean hasOfficialDocument = attachmentRepository
                    .countByExpenseApprovalIdxAndAttachmentTypeAndDeletedFalse(ea.getIdx(), "DOCUMENT") > 0;

            // 정산상태 코드 → 한글명
            String statusCode = ea.getSettlementStatus() != null ? ea.getSettlementStatus() : "C1001";
            CodeConstants.ExpenseSettlementStatus settlementEnum = CodeConstants.ExpenseSettlementStatus.fromCodeOrNull(statusCode);
            String statusName = settlementEnum != null ? settlementEnum.getName() : statusCode;

            return AdminExpenseDocumentDTO.builder()
                    .idx(ea.getIdx())
                    .userIdx(ea.getUserIdx())
                    .userName(user != null ? user.getEmpName() : "-")
                    .userDept(user != null ? user.getEmpDept() : "-")
                    .userDeptName(deptName)
                    .userPosition(posName)
                    .documentIdx(ea.getDocumentIdx())
                    .documentNumber(ea.getDocumentNumber())
                    .totalAmount(ea.getTotalAmount())
                    .detailCount(detailCount)
                    .receiptAttachedCount(receiptAttachedCount)
                    .hasOfficialDocument(hasOfficialDocument)
                    .settlementStatus(statusCode)
                    .settlementStatusName(statusName)
                    .settlementComment(ea.getSettlementComment())
                    .settlementStatusUpdatedAt(ea.getSettlementStatusUpdatedAt())
                    .settlementStatusUpdatedBy(ea.getSettlementStatusUpdatedBy())
                    .createdAt(ea.getCreatedAt())
                    .updatedAt(ea.getUpdatedAt())
                    .deleted(ea.getDeleted())
                    .deletedAt(ea.getDeletedAt())
                    .deletedUserIdx(ea.getDeletedUserIdx())
                    .build();
        }).toList();
    }

    @Override
    @Transactional
    public void adminDeleteExpenseApproval(Long idx, Long adminUserIdx) {
        log.info("관리자 삭제 - idx: {}, adminUserIdx: {}", idx, adminUserIdx);

        ExpenseApproval ea = expenseApprovalRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출승인서를 찾을 수 없습니다. idx: " + idx));

        ea.softDelete(adminUserIdx);
        expenseApprovalRepository.save(ea);

        if (ea.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(ea.getDocumentIdx()).ifPresent(doc -> {
                doc.setDeletedAt(LocalDateTime.now());
                doc.setDeletedUserIdx(adminUserIdx);
                approvalDocumentRepository.save(doc);
            });
        }

        attachmentRepository.softDeleteByExpenseApprovalIdx(idx, adminUserIdx);
    }

    @Override
    @Transactional
    public void updateSettlementStatus(Long idx, String statusCode, String comment, Long adminUserIdx) {
        log.info("정산상태 변경 - idx: {}, status: {}, admin: {}", idx, statusCode, adminUserIdx);

        // 코드 유효성 검증
        CodeConstants.ExpenseSettlementStatus status = CodeConstants.ExpenseSettlementStatus.fromCodeOrNull(statusCode);
        if (status == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 정산상태 코드: " + statusCode);
        }

        ExpenseApproval ea = expenseApprovalRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출승인서를 찾을 수 없습니다. idx: " + idx));

        ea.setSettlementStatus(statusCode);
        ea.setSettlementComment(comment);
        ea.setSettlementStatusUpdatedAt(LocalDateTime.now());
        ea.setSettlementStatusUpdatedBy(adminUserIdx);
        expenseApprovalRepository.save(ea);
    }

    @Override
    @Transactional
    public int batchUpdateSettlementStatus(List<Long> idxList, String statusCode, String comment, Long adminUserIdx) {
        log.info("정산상태 일괄 변경 - count: {}, status: {}, admin: {}", idxList.size(), statusCode, adminUserIdx);

        CodeConstants.ExpenseSettlementStatus status = CodeConstants.ExpenseSettlementStatus.fromCodeOrNull(statusCode);
        if (status == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 정산상태 코드: " + statusCode);
        }

        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        for (Long idx : idxList) {
            expenseApprovalRepository.findById(idx).ifPresent(ea -> {
                ea.setSettlementStatus(statusCode);
                ea.setSettlementComment(comment);
                ea.setSettlementStatusUpdatedAt(now);
                ea.setSettlementStatusUpdatedBy(adminUserIdx);
                expenseApprovalRepository.save(ea);
            });
            updated++;
        }
        return updated;
    }

    @Override
    @Transactional
    public void submitExpenseApproval(Long idx, Long userIdx) {
        log.info("사용자 제출 - idx: {}, user: {}", idx, userIdx);

        ExpenseApproval ea = expenseApprovalRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출승인서를 찾을 수 없습니다. idx: " + idx));

        if (!ea.getUserIdx().equals(userIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 제출할 수 있습니다.");
        }

        String current = ea.getSettlementStatus() != null ? ea.getSettlementStatus() : "C1001";
        // 작성중(C1001) 또는 반려(C1004)일 때만 제출 가능
        if (!"C1001".equals(current) && !"C1004".equals(current)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "현재 상태에서는 제출할 수 없습니다. (현재: " + current + ")");
        }

        ea.setSettlementStatus("C1002"); // 제출완료
        ea.setSettlementComment(null);   // 기존 미흡 사유 초기화
        ea.setSettlementStatusUpdatedAt(LocalDateTime.now());
        ea.setSettlementStatusUpdatedBy(userIdx);
        expenseApprovalRepository.save(ea);
    }

    // ── private helpers ────────────────────────────────────────────────────

    private void validateExpenseDetails(List<ExpenseDetailDTO> details) {
        if (details == null || details.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지출 항목은 최소 1건 이상이어야 합니다.");
        }
        for (ExpenseDetailDTO d : details) {
            if (!ALLOWED_PAYMENT_METHODS.contains(d.getPaymentMethod())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "결제수단은 '개인카드' 또는 '현금'만 허용됩니다. 입력값: " + d.getPaymentMethod());
            }
        }
    }

    /** 항목의 날짜/적요가 변경되었을 때 해당 항목의 ITEM_RECEIPT 표시명을 일괄 갱신 */
    private void renameItemReceiptAttachments(ExpenseDetail detail) {
        List<ExpenseApprovalAttachment> atts = attachmentRepository
                .findByExpenseDetailIdxAndDeletedFalseOrderByIdxAsc(detail.getIdx());
        if (atts.isEmpty()) return;

        String dateStr = detail.getExpenseDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String desc = detail.getDescription() != null ? detail.getDescription() : "영수증";
        String displayBase = "지출승인서_" + dateStr + "_" + desc;

        for (int i = 0; i < atts.size(); i++) {
            ExpenseApprovalAttachment att = atts.get(i);
            String oldName = att.getOriginalFilename();
            String ext = oldName.contains(".") ? oldName.substring(oldName.lastIndexOf('.')) : "";
            att.setOriginalFilename(displayBase + "_" + (i + 1) + ext);
        }
    }

    private List<ExpenseDetail> buildDetails(List<ExpenseDetailDTO> dtos, Long approvalIdx, Long loginUserIdx) {
        return dtos.stream()
                .map(dto -> ExpenseDetail.builder()
                        .expenseApprovalIdx(approvalIdx)
                        .expenseDate(dto.getExpenseDate())
                        .description(dto.getDescription())
                        .shopName(dto.getShopName())
                        .paymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : "개인카드")
                        .amount(dto.getAmount())
                        .note(dto.getNote())
                        .createdUserIdx(loginUserIdx)
                        .updatedUserIdx(loginUserIdx)
                        .build())
                .toList();
    }
}
