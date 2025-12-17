package com.pinecni.erp.api.vacation.scheduler;

import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.service.VacationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * 연차 발생 스케줄러
 * - 매일 00:05에 오늘 발생해야 할 연차 처리 (기본 연차, 근속가산, 월차, 비례연차)
 * - 매년 1월 1일 00:00에 전체 사용자의 연차 발생 일정 생성
 * - 애플리케이션 시작 시 현재 연도 연차 발생 일정 생성 (초기화)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VacationScheduler {

    private final VacationService vacationService;
    private final VacationAccrualScheduleRepository accrualScheduleRepository;

    /**
     * 매년 1월 1일 00:00에 실행 (Asia/Seoul 시간대)
     * 전체 사용자의 새로운 연도 연차 발생 일정 생성
     */
    @Scheduled(cron = "0 0 0 1 1 ?", zone = "Asia/Seoul")
    public void annualVacationScheduleGeneration() {
        int currentYear = LocalDate.now().getYear();

        log.info("=== 연차 발생 일정 연간 생성 시작 ({}년) ===", currentYear);

        try {
            int processedCount = vacationService.generateAllVacationAccrualSchedules(currentYear);

            log.info("=== 연차 발생 일정 연간 생성 완료 - {}년, 처리 인원: {}명 ===", currentYear, processedCount);
        } catch (Exception e) {
            log.error("연차 발생 일정 연간 생성 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }
    }

    /**
     * 매일 00:05에 실행 (Asia/Seoul 시간대)
     * 오늘 발생해야 할 연차를 처리
     * - 1월 1일: 기본 연차 15일 발생 (1년 이상 근속자)
     * - 입사일 기준: 근속가산 발생 (만 2년, 4년...)
     * - 매월 입사일+1: 월차 1일 발생 (1년 미만 또는 1년 초과하는 해)
     * - 1년일: 비례 연차 발생
     */
    @Scheduled(cron = "0 5 0 * * ?", zone = "Asia/Seoul")
    public void dailyVacationAccrual() {
        LocalDate today = LocalDate.now();

        log.info("=== 연차 일일 발생 처리 시작 ({}) ===", today);

        try {
            int accrualCount = vacationService.processDailyAccruals(today);

            log.info("=== 연차 일일 발생 처리 완료 - {}, 발생 건수: {}건 ===", today, accrualCount);
        } catch (Exception e) {
            log.error("연차 일일 발생 처리 실패 ({}): {}", today, e.getMessage(), e);
        }
    }

    /**
     * 애플리케이션 시작 시 즉시 실행 (초기 데이터 로드)
     * 서버 시작 후 15초 뒤에 실행
     * 현재 연도의 연차 발생 일정을 자동으로 생성
     * - 이미 해당 연도 데이터가 존재하면 스킵
     */
    @Scheduled(initialDelay = 15000, fixedDelay = Long.MAX_VALUE)
    public void initialVacationScheduleGeneration() {
        int currentYear = LocalDate.now().getYear();

        // 이미 해당 연도 데이터가 존재하면 스킵
        if (accrualScheduleRepository.existsByYear(currentYear)) {
            log.info("=== 연차 발생 일정 초기 생성 스킵 - {}년 데이터 이미 존재 ===", currentYear);
            return;
        }

        log.info("=== 연차 발생 일정 초기 생성 시작 ({}년) ===", currentYear);

        try {
            int processedCount = vacationService.generateAllVacationAccrualSchedules(currentYear);

            log.info("=== 연차 발생 일정 초기 생성 완료 - {}년, 처리 인원: {}명 ===", currentYear, processedCount);
        } catch (Exception e) {
            log.error("연차 발생 일정 초기 생성 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }
    }
}
