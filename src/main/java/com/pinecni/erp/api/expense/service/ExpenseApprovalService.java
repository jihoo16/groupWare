package com.pinecni.erp.api.expense.service;

import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.entity.ExpenseApproval;

import java.util.List;

public interface ExpenseApprovalService {

    /**
     * 지출승인서 생성 (문서번호 채번 + approval_documents 등록 포함)
     */
    ExpenseApproval createExpenseApproval(ExpenseApprovalCreateDTO createDTO);

    /**
     * 지출승인서 조회 (상세 항목 포함)
     */
    ExpenseApproval getExpenseApprovalWithDetails(Long idx);

    /**
     * 사용자별 지출승인서 목록 조회 (본인 것만, soft delete 제외)
     */
    List<ExpenseApproval> getExpenseApprovalsByUser(Long userIdx);

    /**
     * 지출승인서 수정 (expense_detail 전체 삭제 후 재삽입)
     */
    ExpenseApproval updateExpenseApproval(Long idx, ExpenseApprovalCreateDTO updateDTO, Long loginUserIdx);

    /**
     * 지출승인서 삭제 (soft delete, approval_documents 함께 처리)
     */
    void deleteExpenseApproval(Long idx, Long loginUserIdx);
}
