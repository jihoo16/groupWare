package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ExpenseRequisitionCreateDTO;
import com.pinecni.erp.api.document.dto.ExpenseRequisitionDTO;

import java.util.List;

public interface ExpenseRequisitionService {

    /** 지출품의서 신규 저장 */
    ExpenseRequisitionDTO create(ExpenseRequisitionCreateDTO dto, Long userIdx);

    /** 지출품의서 단건 조회 (항목 포함) */
    ExpenseRequisitionDTO getOne(Long idx);

    /** 작성자별 지출품의서 목록 조회 */
    List<ExpenseRequisitionDTO> getList(Long userIdx);

    /** 지출품의서 수정 */
    ExpenseRequisitionDTO update(Long idx, ExpenseRequisitionCreateDTO dto, Long userIdx);

    /** 지출품의서 소프트 삭제 */
    void delete(Long idx, Long userIdx);
}
