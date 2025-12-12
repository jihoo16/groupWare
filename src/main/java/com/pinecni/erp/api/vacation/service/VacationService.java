package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.entity.VacationBalance;

import java.math.BigDecimal;

/**
 * Vacation Service Interface
 */
public interface VacationService {

    /**
     * 연차 신청서용 사용자 정보 조회 (사용자 정보 + 연차 잔액)
     */
    VacationUserInfoDTO getUserVacationInfo(Long userIdx, Integer year);

    /**
     * 특정 사용자의 특정 연도 연차를 계산하여 저장
     * @param userIdx 사용자 IDX
     * @param year 대상 연도
     * @return 계산된 연차 정보
     */
    VacationBalance calculateAndSaveVacationBalance(Long userIdx, Integer year);

    /**
     * 특정 사용자의 입사일 기준 연차 수 계산
     * @param userIdx 사용자 IDX
     * @param year 대상 연도
     * @return 계산된 연차 일수
     */
    BigDecimal calculateVacationDays(Long userIdx, Integer year);

    /**
     * 전체 재직 중인 사용자의 연차를 계산하여 저장
     * @param year 대상 연도
     * @return 처리된 사용자 수
     */
    int calculateAndSaveAllVacationBalances(Integer year);
}
