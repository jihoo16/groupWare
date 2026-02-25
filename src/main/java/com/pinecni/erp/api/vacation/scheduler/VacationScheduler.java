package com.pinecni.erp.api.vacation.scheduler;

import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.service.VacationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 연차 발생 / 잔액 스케줄러
 *
 * 실행 순서 (매일):
 *  00:01 markExpiredMonthlyJob   — 만료 월차 is_expired = true
 *  00:05 dailyVacationAccrual    — 오늘 발생해야 할 연차 INSERT
 *  00:10 dailyBalanceRefresh     — vacation_balance 전체 재계산 (UPSERT)
 *
 * 연간 (1/1 00:00):
 *  annualVacationScheduleGeneration — 신년도 accrual 일정 생성 + balance 초기화
 *
 * 서버 시작 (15초 후, 1회):
 *  initialVacationScheduleGeneration
 *    Step1 — accrual schedule 없으면 생성
 *    Step2 — vacation_balance 없거나 부족하면 전체 UPSERT
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class VacationScheduler {

    private final VacationService vacationService;
    private final VacationAccrualScheduleRepository accrualScheduleRepository;

    // ── 연간 작업 ──────────────────────────────────────────────────────────

    /**
     * 매년 1월 1일 00:00에 실행 (Asia/Seoul)
     * 신년도 전체 사용자 accrual 일정 생성 → vacation_balance 초기화
     */
    @Scheduled(cron = "0 0 0 1 1 ?", zone = "Asia/Seoul")
    public void annualVacationScheduleGeneration() {
        int currentYear = LocalDate.now().getYear();
        log.info("=== [연간] accrual 일정 생성 시작 ({}년) ===", currentYear);

        try {
            int scheduleCount = vacationService.generateAllVacationAccrualSchedules(currentYear);
            log.info("=== [연간] accrual 일정 생성 완료 - {}년, {}명 ===", currentYear, scheduleCount);
        } catch (Exception e) {
            log.error("[연간] accrual 일정 생성 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }

        // accrual 생성 직후 balance 초기화 (00:10 job보다 먼저 실행되므로 여기서도 처리)
        try {
            int balanceCount = vacationService.computeAndSaveAllVacationBalances(currentYear);
            log.info("=== [연간] vacation_balance 초기화 완료 - {}년, {}명 ===", currentYear, balanceCount);
        } catch (Exception e) {
            log.error("[연간] vacation_balance 초기화 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }
    }

    // ── 일일 작업 ──────────────────────────────────────────────────────────

    /**
     * 매일 00:01 — 만료된 월차 is_expired = true 처리
     * 월차 만료일(expiry_date) < 오늘인 행을 일괄 업데이트
     */
    @Scheduled(cron = "0 1 0 * * ?", zone = "Asia/Seoul")
    @Transactional
    public void markExpiredMonthlyJob() {
        LocalDate today = LocalDate.now();
        log.info("=== [일일] 월차 만료 처리 시작 ({}) ===", today);

        try {
            int expiredCount = accrualScheduleRepository.markExpiredMonthly(today);
            log.info("=== [일일] 월차 만료 처리 완료 - {}, {}건 ===", today, expiredCount);
        } catch (Exception e) {
            log.error("[일일] 월차 만료 처리 실패 ({}): {}", today, e.getMessage(), e);
        }
    }

    /**
     * 매일 00:05 — 오늘 발생해야 할 연차 처리
     * (기본연차 / 근속가산 / 보상휴가 / 월차 / 비례연차)
     */
    @Scheduled(cron = "0 5 0 * * ?", zone = "Asia/Seoul")
    public void dailyVacationAccrual() {
        LocalDate today = LocalDate.now();
        log.info("=== [일일] 연차 발생 처리 시작 ({}) ===", today);

        try {
            int accrualCount = vacationService.processDailyAccruals(today);
            log.info("=== [일일] 연차 발생 처리 완료 - {}, {}건 ===", today, accrualCount);
        } catch (Exception e) {
            log.error("[일일] 연차 발생 처리 실패 ({}): {}", today, e.getMessage(), e);
        }
    }

    /**
     * 매일 00:10 — vacation_balance 전체 재계산 (UPSERT)
     * 00:01 만료처리 + 00:05 발생처리 결과를 반영.
     * vacation_balance 행이 없는 사용자(신규 입사자 등)도 자동 INSERT.
     */
    @Scheduled(cron = "0 10 0 * * ?", zone = "Asia/Seoul")
    public void dailyBalanceRefresh() {
        int currentYear = LocalDate.now().getYear();
        log.info("=== [일일] vacation_balance 갱신 시작 ({}년) ===", currentYear);

        try {
            int count = vacationService.computeAndSaveAllVacationBalances(currentYear);
            log.info("=== [일일] vacation_balance 갱신 완료 - {}년, {}명 ===", currentYear, count);
        } catch (Exception e) {
            log.error("[일일] vacation_balance 갱신 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }
    }

    // ── 서버 시작 초기화 ───────────────────────────────────────────────────

    /**
     * 서버 시작 15초 후 1회 실행
     *
     * Step 1. vacation_accrual_schedule
     *   - 전체 활성 사용자 대상 일정 생성 (deleteByUserIdxAndYear 후 재생성 — 멱등성 보장)
     *   - existsByYear 가드 제거: 일부 사용자 데이터만 존재하는 경우에도 누락 없이 처리
     *
     * Step 2. vacation_balance
     *   - 항상 전체 UPSERT 실행
     *   - 신규 입사자, 당해 연도 balance 없음, 스케줄러 누락 등 모든 케이스 보정
     */
    @Scheduled(initialDelay = 15000, fixedDelay = Long.MAX_VALUE)
    public void initialVacationScheduleGeneration() {
        int currentYear = LocalDate.now().getYear();

        // Step 1: accrual schedule — 항상 재생성 (사용자별 delete→insert 이므로 멱등)
        log.info("=== [초기화] accrual 일정 생성 시작 ({}년) ===", currentYear);
        try {
            int scheduleCount = vacationService.generateAllVacationAccrualSchedules(currentYear);
            log.info("=== [초기화] accrual 일정 생성 완료 - {}년, {}명 ===", currentYear, scheduleCount);
        } catch (Exception e) {
            log.error("[초기화] accrual 일정 생성 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }

        // Step 2: vacation_balance — 항상 UPSERT (행 없으면 INSERT, 있으면 UPDATE)
        log.info("=== [초기화] vacation_balance 계산 시작 ({}년) ===", currentYear);
        try {
            int balanceCount = vacationService.computeAndSaveAllVacationBalances(currentYear);
            log.info("=== [초기화] vacation_balance 계산 완료 - {}년, {}명 ===", currentYear, balanceCount);
        } catch (Exception e) {
            log.error("[초기화] vacation_balance 계산 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }
    }
}
