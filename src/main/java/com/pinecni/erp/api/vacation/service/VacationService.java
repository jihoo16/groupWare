package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;

import java.time.LocalDate;

/**
 * Vacation Service Interface
 */
public interface VacationService {

    /**
     * 연차 신청서용 사용자 정보 조회 (사용자 정보 + 연차 잔액)
     */
    VacationUserInfoDTO getUserVacationInfo(Long userIdx, Integer year);

    /**
     * 특정 사용자의 특정 연도 연차 발생 일정 생성
     * @param userIdx 사용자 IDX
     * @param year 대상 연도
     * @param operatorUserIdx 생성을 실행한 사용자 IDX
     */
    void generateVacationAccrualSchedule(Long userIdx, Integer year, Long operatorUserIdx);

    /**
     * 전체 재직 중인 사용자의 특정 연도 연차 발생 일정 생성
     * @param year 대상 연도
     * @return 처리된 사용자 수
     */
    int generateAllVacationAccrualSchedules(Integer year);

    /**
     * 특정 날짜에 발생해야 할 연차를 처리 (스케줄러용)
     * - 오늘 기본 연차가 발생하는 사용자 (1월 1일)
     * - 오늘 근속가산이 발생하는 사용자 (입사일 기준 만 2년, 4년...)
     * - 오늘 월차가 발생하는 사용자 (매월 입사일+1일, 간소화: 만근 가정)
     * - 오늘 비례 연차가 발생하는 사용자 (1년일)
     * @param targetDate 처리할 날짜
     * @return 발생 건수
     */
    int processDailyAccruals(LocalDate targetDate);
}
