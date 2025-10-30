package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.FixedExpensePolicyDTO;
import com.pinecni.erp.api.project.dto.FixedExpensePolicyUpdateDTO;

import java.util.List;

/**
 * 직급별 고정경비 정책 Service Interface
 */
public interface FixedExpensePolicyService {

    /**
     * 전체 고정경비 정책 목록 조회
     */
    List<FixedExpensePolicyDTO> getAllPolicies();

    /**
     * 직급별 고정경비 정책 조회
     */
    FixedExpensePolicyDTO getPolicyByPositionCode(String positionCode);

    /**
     * 고정경비 정책 생성 또는 수정 (Upsert)
     * - 해당 직급 정책이 없으면 생성, 있으면 수정
     */
    FixedExpensePolicyDTO upsertPolicy(FixedExpensePolicyUpdateDTO updateDTO, Long userIdx);

    /**
     * 여러 고정경비 정책 일괄 저장
     */
    List<FixedExpensePolicyDTO> upsertPolicies(List<FixedExpensePolicyUpdateDTO> updateDTOs, Long userIdx);

    /**
     * 고정경비 정책 삭제
     */
    void deletePolicy(String positionCode);
}
