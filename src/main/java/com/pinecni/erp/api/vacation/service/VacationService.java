package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;

/**
 * Vacation Service Interface
 */
public interface VacationService {
    
    /**
     * 연차 신청서용 사용자 정보 조회 (사용자 정보 + 연차 잔액)
     */
    VacationUserInfoDTO getUserVacationInfo(Long userIdx, Integer year);
}
