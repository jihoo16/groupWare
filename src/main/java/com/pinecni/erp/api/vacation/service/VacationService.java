package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.dto.VacationCalculationDetailDTO;
import com.pinecni.erp.api.vacation.dto.VacationRequestSaveDTO;
import com.pinecni.erp.api.vacation.dto.AdminProxyVacationRequestDTO;
import com.pinecni.erp.api.vacation.dto.VacationDetailDTO;
import com.pinecni.erp.entity.User;

import java.time.LocalDate;
import java.util.List;

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
     * 전체 재직 중인 사용자의 특정 연도 연차 발생 일정 생성 (사용자 목록 재활용)
     * 스케줄러에서 findAllActive() 중복 호출을 방지하기 위한 오버로드.
     */
    int generateAllVacationAccrualSchedules(Integer year, List<User> activeUsers);

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

    /**
     * 관리자 대리 연차 신청
     * - 출장/외근 직군의 종이/구두 신청을 관리자가 사후 기록할 때 사용
     * - 등록 즉시 자동 승인 + 캘린더 일정 생성
     * - is_proxy_request=true, created_user_idx=관리자, user_idx=대상자
     * - 마이너스 연차 자동 허용 (사후 기록이므로 잔여 부족 케이스 대응)
     * - PDF는 서버사이드 템플릿 렌더링으로 자동 생성
     *
     * @param adminUserIdx 관리자 IDX (현재 로그인 사용자)
     * @param dto          대리 신청 정보 (대상자, 유형, 기간, 사유)
     * @return 생성된 문서 IDX
     */
    Long saveProxyVacationRequest(Long adminUserIdx, AdminProxyVacationRequestDTO dto);

    /**
     * 연차신청서 상세 조회
     * @param documentIdx 문서 IDX (approval_documents의 idx)
     * @return 연차신청서 상세 정보
     */
    VacationDetailDTO getVacationDetail(Long documentIdx);

    /**
     * 단일 사용자 당일 연차 발생 처리 (processDailyAccruals 내부에서 사용자별 독립 트랜잭션으로 호출)
     * @param userIdx 사용자 IDX
     * @param targetDate 처리할 날짜
     * @return 발생 건수
     */
    int processDailyAccrualsForUser(Long userIdx, LocalDate targetDate);

    /**
     * vacation_balance 계산 및 UPSERT (단일 사용자)
     * - vacation_accrual_schedule 집계 + vacation_request 사용량으로 vacation_balance 갱신
     * @param userIdx 사용자 IDX
     * @param year 대상 연도
     */
    void computeAndSaveVacationBalance(Long userIdx, Integer year);

    /**
     * vacation_balance 전체 재계산 (전체 재직자)
     * @param year 대상 연도
     * @return 처리된 사용자 수
     */
    int computeAndSaveAllVacationBalances(Integer year);

    /**
     * vacation_balance 전체 재계산 (사용자 목록 재활용)
     * 스케줄러에서 findAllActive() 중복 호출을 방지하기 위한 오버로드.
     */
    int computeAndSaveAllVacationBalances(Integer year, List<User> activeUsers);

    /**
     * 전년도 미사용 월차 이월 처리 (전체 재직자)
     * - 전년도 유효 월차 중 잔여분을 신년도 이월월차(TYPE_CARRY_OVER) 레코드로 생성
     * - 이미 처리된 사용자는 스킵 (멱등성 보장)
     * - annualVacationScheduleGeneration 및 initialVacationScheduleGeneration에서 호출
     * @param fromYear 이월 출처 연도 (예: 2025 → 2026으로 이월 시 2025)
     * @return 처리된 사용자 수
     */
    int performAllCarryOvers(int fromYear);

    /**
     * 전년도 미사용 월차 이월 처리 (사용자 목록 재활용)
     * 스케줄러에서 findAllActive() 중복 호출을 방지하기 위한 오버로드.
     */
    int performAllCarryOvers(int fromYear, List<User> activeUsers);

    /**
     * 단일 사용자 월차 이월 처리 (performAllCarryOvers 내부에서 사용자별 독립 트랜잭션으로 호출)
     * - fromYear 의 유효 월차 잔여분을 toYear 이월월차 레코드로 생성
     * - 이미 처리된 경우 스킵 (멱등성)
     * @param userIdx  사용자 IDX
     * @param fromYear 이월 출처 연도
     */
    void performCarryOverForUser(Long userIdx, int fromYear);

    /**
     * 연차신청서 삭제 (soft delete + 캘린더 일정 삭제)
     * @param documentIdx 문서 IDX (approval_documents의 idx)
     * @param currentUserIdx 삭제 요청자 사용자 IDX
     * @param isAdmin 관리자 여부 (true면 서명 게이트 우회)
     */
    void deleteVacation(Long documentIdx, Long currentUserIdx, boolean isAdmin);

    /**
     * 관리자 연차 신청서 승인 / 승인 취소
     * - 한 문서에 여러 기간이 있는 경우 모두 동일한 상태로 일괄 업데이트
     * @param documentIdx 문서 IDX (approval_documents의 idx)
     * @param approverUserIdx 승인 처리한 관리자 IDX
     * @param approve true = 승인, false = 승인 취소
     */
    void approveVacation(Long documentIdx, Long approverUserIdx, boolean approve);
}
