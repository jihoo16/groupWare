package com.pinecni.erp.api.expense.repository;

import com.pinecni.erp.entity.ExpenseApprovalAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 지출승인서 첨부파일 Repository
 */
@Repository
public interface ExpenseApprovalAttachmentRepository extends JpaRepository<ExpenseApprovalAttachment, Long> {

    /** 지출승인서별 첨부파일 목록 조회 (삭제 제외, idx 오름차순) */
    List<ExpenseApprovalAttachment> findByExpenseApprovalIdxAndDeletedFalseOrderByIdxAsc(Long expenseApprovalIdx);

    /** 지출승인서 + 첨부파일 종류별 파일 수 (연번 계산용, 삭제 제외) */
    long countByExpenseApprovalIdxAndAttachmentTypeAndDeletedFalse(
            Long expenseApprovalIdx, String attachmentType);

    /** 지출승인서의 모든 첨부파일 소프트 딜리트 */
    @Modifying
    @Query("""
        UPDATE ExpenseApprovalAttachment a
        SET a.deleted = true,
            a.deletedAt = CURRENT_TIMESTAMP,
            a.deletedUserIdx = :deletedUserIdx
        WHERE a.expenseApprovalIdx = :expenseApprovalIdx
          AND a.deleted = false
        """)
    void softDeleteByExpenseApprovalIdx(
            @Param("expenseApprovalIdx") Long expenseApprovalIdx,
            @Param("deletedUserIdx") Long deletedUserIdx);
}
