package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.dto.VacationCalculationDetailDTO;
import com.pinecni.erp.api.vacation.dto.VacationRequestSaveDTO;

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

    /**
     * 연차 계산 상세 정보 조회 (총 연차 모달용)
     * - 입사일 기준으로 해당 연도의 예상 연차 계산
     * - 미래 연도도 계산 가능
     * - 근속연차 발생 예정일 포함
     * @param userIdx 사용자 IDX
     * @param year 조회할 연도
     * @return 연차 계산 상세 정보
     */
    VacationCalculationDetailDTO getVacationCalculationDetail(Long userIdx, Integer year);

    /**
     * 연차 신청서 저장
     * - approval_documents에 문서 메타데이터 저장
     * - vacation_request에 연차 상세 정보 저장 (여러 기간 개별 저장)
     * @param userIdx 신청자 IDX
     * @param saveDTO 연차 신청 정보
     * @return 생성된 문서 IDX
     */
    Long saveVacationRequest(Long userIdx, VacationRequestSaveDTO saveDTO);
}
