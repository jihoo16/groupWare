package com.pinecni.erp.service;

import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.entity.ExpenseApproval;

import java.util.List;

public interface ExpenseApprovalService {

    /**
     * 지출승인서 생성
     */
    ExpenseApproval createExpenseApproval(ExpenseApprovalCreateDTO createDTO);

    /**
     * 지출승인서 조회 (상세 항목 포함)
     */
    ExpenseApproval getExpenseApprovalWithDetails(Long idx);

    /**
     * 사용자별 지출승인서 목록 조회
     */
    List<ExpenseApproval> getExpenseApprovalsByUser(Long userIdx);

    /**
     * 지출승인서 삭제
     */
    void deleteExpenseApproval(Long idx);
}
