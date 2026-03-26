package com.pinecni.erp.api.expense.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.api.expense.dto.ExpenseDetailDTO;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.ExpenseApproval;
import com.pinecni.erp.entity.ExpenseDetail;
import com.pinecni.erp.api.expense.repository.ExpenseApprovalRepository;
import com.pinecni.erp.api.expense.repository.ExpenseDetailRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.pinecni.erp.constant.CodeConstants;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

        // 2. approval_documents 저장
        ApprovalDocument doc = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(DOC_TYPE.getName())
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

        // 본인 문서 검증
        if (!expenseApproval.getUserIdx().equals(loginUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 문서만 수정할 수 있습니다.");
        }

        validateExpenseDetails(updateDTO.getExpenseDetails());

        // 기존 항목 전체 삭제 후 재삽입 (orphanRemoval)
        expenseApproval.getExpenseDetails().clear();
        expenseApprovalRepository.flush();

        // total_amount 재계산
        long totalAmount = updateDTO.getExpenseDetails().stream()
                .mapToLong(ExpenseDetailDTO::getAmount)
                .sum();

        // 헤더 업데이트
        expenseApproval.setTotalAmount(totalAmount);
        expenseApproval.setUpdatedUserIdx(loginUserIdx);

        // 새 항목 삽입
        List<ExpenseDetail> newDetails = buildDetails(updateDTO.getExpenseDetails(), idx, loginUserIdx);
        expenseDetailRepository.saveAll(newDetails);

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
                idx, totalAmount, newDetails.size());

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
