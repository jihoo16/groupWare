package com.pinecni.erp.api.expense.service;

import com.pinecni.erp.api.expense.dto.AdminExpenseDocumentDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalAttachmentDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalCreateDTO;
import com.pinecni.erp.api.expense.dto.ExpenseApprovalDTO;
import com.pinecni.erp.entity.ExpenseApproval;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

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

    /**
     * 현재 기간(전월 14일 ~ 당월 13일) 내 문서 존재 여부 확인
     * exists: 존재 여부, documentIdx: 존재 시 해당 문서 idx
     */
    Map<String, Object> checkCurrentPeriod(Long userIdx);

    /** 첨부파일 저장 (RECEIPT 또는 DOCUMENT 타입) */
    List<ExpenseApprovalAttachmentDTO> saveAttachments(Long expenseApprovalIdx, MultipartFile[] files,
                                                       String attachmentType, Long uploadUserIdx);

    /** 지출승인서 첨부파일 목록 조회 */
    List<ExpenseApprovalAttachmentDTO> getAttachments(Long expenseApprovalIdx);

    /** 첨부파일 소프트 딜리트 */
    void deleteAttachment(Long attachmentIdx, Long deletedUserIdx);

    /** 첨부파일 단건 조회 (다운로드용) */
    ExpenseApprovalAttachmentDTO getAttachmentById(Long attachmentIdx);

    /** 항목별 영수증 저장 (ITEM_RECEIPT 타입) */
    List<ExpenseApprovalAttachmentDTO> saveItemAttachments(
            Long expenseApprovalIdx, Long expenseDetailIdx,
            MultipartFile[] files, Long uploadUserIdx);

    /** 특정 항목의 영수증 목록 조회 */
    List<ExpenseApprovalAttachmentDTO> getItemAttachments(Long expenseDetailIdx);

    // ── 관리자 전용 ────────────────────────────────────────────

    /** 전체 개인경비청구 문서 목록 조회 (관리자용, 삭제 포함) */
    List<AdminExpenseDocumentDTO> getAllExpenseDocumentsForAdmin();

    /** 관리자 문서 삭제 (본인 문서 아니어도 가능) */
    void adminDeleteExpenseApproval(Long idx, Long adminUserIdx);

    /** 관리자 - 정산상태 변경 (단건) */
    void updateSettlementStatus(Long idx, String statusCode, String comment, Long adminUserIdx);

    /** 관리자 - 정산상태 일괄 변경 */
    int batchUpdateSettlementStatus(List<Long> idxList, String statusCode, String comment, Long adminUserIdx);

    /** 사용자 - 제출 (작성중/반려 → 제출완료) */
    void submitExpenseApproval(Long idx, Long userIdx);
}
