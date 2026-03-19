package com.pinecni.erp.service.impl;

import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.api.expense.dto.ExpenseDetailDTO;
import com.pinecni.erp.entity.ExpenseApproval;
import com.pinecni.erp.entity.ExpenseDetail;
import com.pinecni.erp.repository.ExpenseApprovalRepository;
import com.pinecni.erp.repository.ExpenseDetailRepository;
import com.pinecni.erp.service.ExpenseApprovalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ExpenseApprovalServiceImpl implements ExpenseApprovalService {

    private final ExpenseApprovalRepository expenseApprovalRepository;
    private final ExpenseDetailRepository expenseDetailRepository;

    @Override
    public ExpenseApproval createExpenseApproval(ExpenseApprovalCreateDTO createDTO) {
        log.info("지출승인서 생성 시작 - 사용자: {}", createDTO.getUserIdx());

        // 총 금액 계산
        Long totalAmount = createDTO.getExpenseDetails().stream()
                .mapToLong(ExpenseDetailDTO::getAmount)
                .sum();

        // ExpenseApproval 생성
        ExpenseApproval expenseApproval = ExpenseApproval.builder()
                .userIdx(createDTO.getUserIdx())
                .totalAmount(totalAmount)
                .createdUserIdx(createDTO.getUserIdx())
                .updatedUserIdx(createDTO.getUserIdx())
                .build();

        expenseApproval = expenseApprovalRepository.save(expenseApproval);

        // ExpenseDetail 생성 및 저장
        final Long expenseApprovalIdx = expenseApproval.getIdx();
        List<ExpenseDetail> details = createDTO.getExpenseDetails().stream()
                .map(dto -> ExpenseDetail.builder()
                        .expenseApprovalIdx(expenseApprovalIdx)
                        .expenseDate(dto.getExpenseDate())
                        .description(dto.getDescription())
                        .shopName(dto.getShopName())
                        .paymentMethod(dto.getPaymentMethod() != null ? dto.getPaymentMethod() : "개인카드")
                        .amount(dto.getAmount())
                        .note(dto.getNote())
                        .createdUserIdx(createDTO.getUserIdx())
                        .updatedUserIdx(createDTO.getUserIdx())
                        .build())
                .toList();

        expenseDetailRepository.saveAll(details);

        log.info("지출승인서 생성 완료 - IDX: {}, 총 금액: {}, 항목 수: {}",
                expenseApproval.getIdx(), totalAmount, details.size());

        return expenseApproval;
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseApproval getExpenseApprovalWithDetails(Long idx) {
        log.info("지출승인서 조회 - IDX: {}", idx);
        return expenseApprovalRepository.findByIdxWithDetails(idx)
                .orElseThrow(() -> new IllegalArgumentException("지출승인서를 찾을 수 없습니다. IDX: " + idx));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseApproval> getExpenseApprovalsByUser(Long userIdx) {
        log.info("사용자별 지출승인서 목록 조회 - 사용자 IDX: {}", userIdx);
        return expenseApprovalRepository.findByUserIdxAndDeletedFalseOrderByCreatedAtDesc(userIdx);
    }

    @Override
    public void deleteExpenseApproval(Long idx) {
        log.info("지출승인서 삭제 - IDX: {}", idx);

        ExpenseApproval expenseApproval = expenseApprovalRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("지출승인서를 찾을 수 없습니다. IDX: " + idx));

        expenseApprovalRepository.delete(expenseApproval);
        log.info("지출승인서 삭제 완료 - IDX: {}", idx);
    }
}
