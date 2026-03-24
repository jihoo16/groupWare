package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.document.dto.ExpenseRequisitionCreateDTO;
import com.pinecni.erp.api.document.dto.ExpenseRequisitionDTO;
import com.pinecni.erp.api.document.dto.ExpenseRequisitionItemDTO;
import com.pinecni.erp.api.document.repository.ExpenseRequisitionItemRepository;
import com.pinecni.erp.api.document.repository.ExpenseRequisitionRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.ExpenseRequisition;
import com.pinecni.erp.entity.ExpenseRequisitionItem;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ExpenseRequisitionServiceImpl implements ExpenseRequisitionService {

    private static final String DOCUMENT_TYPE   = "지출품의서";
    private static final String DOCUMENT_PREFIX = "REQ";
    private static final Set<String> ALLOWED_PAYMENT_TYPES =
            Set.of("현금", "사업비카드", "개인카드");

    private final ExpenseRequisitionRepository requisitionRepository;
    private final ExpenseRequisitionItemRepository itemRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final UserRepository userRepository;

    // ── CREATE ───────────────────────────────────────────────────────────────

    @Override
    public ExpenseRequisitionDTO create(ExpenseRequisitionCreateDTO dto, Long userIdx) {
        log.info("지출품의서 생성 시작 - userIdx: {}", userIdx);

        validate(dto);

        // 1. 문서번호 채번
        String documentNo = documentSequenceService.generateDocumentNumber(DOCUMENT_TYPE, DOCUMENT_PREFIX, userIdx);

        // 3. total_amount 계산 (approval_documents.content에도 기록하기 위해 먼저)
        BigDecimal totalAmount = dto.getItems().stream()
                .map(i -> i.getAmount() != null ? i.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. approval_documents 저장
        ApprovalDocument doc = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(DOCUMENT_TYPE)
                .documentType(DOCUMENT_TYPE)
                .content("신청금액: ₩" + String.format("%,d", totalAmount.longValue()))
                .isProject(false)
                .drafterUserIdx(userIdx)
                .createdUserIdx(userIdx)
                .updatedUserIdx(userIdx)
                .build();
        doc = approvalDocumentRepository.save(doc);

        // 4. ExpenseRequisition 저장
        ExpenseRequisition requisition = ExpenseRequisition.builder()
                .authorIdx(userIdx)
                .content(dto.getContent())
                .paymentType(dto.getPaymentType())
                .totalAmount(totalAmount)
                .specialNote(dto.getSpecialNote())
                .documentIdx(doc.getIdx())
                .documentNumber(documentNo)
                .createdUserIdx(userIdx)
                .updatedUserIdx(userIdx)
                .build();
        requisition = requisitionRepository.save(requisition);

        // 5. 항목 저장
        final Long requisitionIdx = requisition.getIdx();
        List<ExpenseRequisitionItem> items = buildItems(dto.getItems(), requisitionIdx);
        itemRepository.saveAll(items);

        log.info("지출품의서 생성 완료 - idx: {}, documentNo: {}, 총금액: {}, 항목수: {}",
                requisition.getIdx(), documentNo, totalAmount, items.size());

        return toDTO(requisition, items, userIdx);
    }

    // ── READ (단건) ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ExpenseRequisitionDTO getOne(Long idx) {
        log.info("지출품의서 단건 조회 - idx: {}", idx);

        ExpenseRequisition requisition = requisitionRepository.findByIdxWithItems(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출품의서를 찾을 수 없습니다. idx: " + idx));

        return toDTO(requisition, requisition.getItems(), requisition.getAuthorIdx());
    }

    // ── READ (목록) ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseRequisitionDTO> getList(Long userIdx) {
        log.info("지출품의서 목록 조회 - userIdx: {}", userIdx);

        return requisitionRepository
                .findByAuthorIdxAndIsDeletedFalseOrderByCreatedAtDesc(userIdx)
                .stream()
                .map(r -> toDTO(r, r.getItems(), userIdx))
                .toList();
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────

    @Override
    public ExpenseRequisitionDTO update(Long idx, ExpenseRequisitionCreateDTO dto, Long userIdx) {
        log.info("지출품의서 수정 시작 - idx: {}, userIdx: {}", idx, userIdx);

        ExpenseRequisition requisition = requisitionRepository.findByIdxWithItems(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출품의서를 찾을 수 없습니다. idx: " + idx));

        if (!requisition.getAuthorIdx().equals(userIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 수정할 수 있습니다.");
        }

        validate(dto);

        // 기존 항목 전체 삭제 후 재삽입 (orphanRemoval 타이밍 보장)
        requisition.getItems().clear();
        requisitionRepository.flush();

        // total_amount 재계산
        BigDecimal totalAmount = dto.getItems().stream()
                .map(i -> i.getAmount() != null ? i.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 헤더 업데이트
        requisition.setContent(dto.getContent());
        requisition.setPaymentType(dto.getPaymentType());
        requisition.setTotalAmount(totalAmount);
        requisition.setSpecialNote(dto.getSpecialNote());
        requisition.setUpdatedUserIdx(userIdx);

        // 새 항목 삽입
        List<ExpenseRequisitionItem> newItems = buildItems(dto.getItems(), idx);
        itemRepository.saveAll(newItems);

        // approval_documents 수정자 + content(금액) 업데이트
        if (requisition.getDocumentIdx() != null) {
            final BigDecimal finalTotalAmount = totalAmount;
            approvalDocumentRepository.findById(requisition.getDocumentIdx()).ifPresent(doc -> {
                doc.setUpdatedUserIdx(userIdx);
                doc.setContent("신청금액: ₩" + String.format("%,d", finalTotalAmount.longValue()));
                approvalDocumentRepository.save(doc);
            });
        }

        log.info("지출품의서 수정 완료 - idx: {}, 총금액: {}, 항목수: {}", idx, totalAmount, newItems.size());

        return toDTO(requisition, newItems, userIdx);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    @Override
    public void delete(Long idx, Long userIdx) {
        log.info("지출품의서 삭제 시작 - idx: {}, userIdx: {}", idx, userIdx);

        ExpenseRequisition requisition = requisitionRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "지출품의서를 찾을 수 없습니다. idx: " + idx));

        if (Boolean.TRUE.equals(requisition.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "지출품의서를 찾을 수 없습니다. idx: " + idx);
        }

        if (!requisition.getAuthorIdx().equals(userIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 삭제할 수 있습니다.");
        }

        requisition.softDelete(userIdx);
        requisitionRepository.save(requisition);

        // approval_documents soft delete
        if (requisition.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(requisition.getDocumentIdx()).ifPresent(doc -> {
                doc.setDeletedAt(LocalDateTime.now());
                doc.setDeletedUserIdx(userIdx);
                approvalDocumentRepository.save(doc);
            });
        }

        log.info("지출품의서 삭제 완료 - idx: {}", idx);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void validate(ExpenseRequisitionCreateDTO dto) {
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "지출 예정 내역은 최소 1건 이상이어야 합니다.");
        }
        if (!ALLOWED_PAYMENT_TYPES.contains(dto.getPaymentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "지급종류는 '현금', '사업비카드', '개인카드' 중 하나여야 합니다. 입력값: " + dto.getPaymentType());
        }
    }

    private List<ExpenseRequisitionItem> buildItems(List<ExpenseRequisitionItemDTO> dtos, Long requisitionIdx) {
        return dtos.stream()
                .map(dto -> ExpenseRequisitionItem.builder()
                        .expenseRequisitionIdx(requisitionIdx)
                        .itemDate(dto.getItemDate() != null ? LocalDate.parse(dto.getItemDate()) : null)
                        .itemDesc(dto.getItemDesc())
                        .amount(dto.getAmount())
                        .vendor(dto.getVendor())
                        .remark(dto.getRemark())
                        .sortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0)
                        .build())
                .toList();
    }

    private ExpenseRequisitionDTO toDTO(ExpenseRequisition r,
                                        List<ExpenseRequisitionItem> items,
                                        Long userIdx) {
        User author = userRepository.findById(r.getAuthorIdx()).orElse(null);

        List<ExpenseRequisitionItemDTO> itemDTOs = items.stream()
                .map(i -> ExpenseRequisitionItemDTO.builder()
                        .idx(i.getIdx())
                        .expenseRequisitionIdx(i.getExpenseRequisitionIdx())
                        .itemDate(i.getItemDate() != null ? i.getItemDate().toString() : null)
                        .itemDesc(i.getItemDesc())
                        .amount(i.getAmount())
                        .vendor(i.getVendor())
                        .remark(i.getRemark())
                        .sortOrder(i.getSortOrder())
                        .build())
                .toList();

        return ExpenseRequisitionDTO.builder()
                .idx(r.getIdx())
                .authorIdx(r.getAuthorIdx())
                .authorName(author != null ? author.getEmpName() : null)
                .authorDept(author != null ? author.getEmpDept() : null)
                .content(r.getContent())
                .paymentType(r.getPaymentType())
                .totalAmount(r.getTotalAmount())
                .specialNote(r.getSpecialNote())
                .documentIdx(r.getDocumentIdx())
                .documentNumber(r.getDocumentNumber())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .items(itemDTOs)
                .build();
    }
}
