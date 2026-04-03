package com.pinecni.erp.api.vacation.scheduler;

import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.service.VacationService;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

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
    private final UserRepository userRepository;

    // ── 연간 작업 ──────────────────────────────────────────────────────────

    /**
     * 매년 1월 1일 00:00에 실행 (Asia/Seoul)
     *
     * 실행 순서:
     *  1. 신년도 accrual 일정 생성
     *  2. 전년도 balance 재계산 (잔여일수 확정)
     *  3. 전년도 → 신년도 월차 이월 처리 (이월월차 레코드 생성)
     *  4. 전년도 balance 재계산 (carried_over_days 반영)
     *  5. 신년도 balance 초기화 (이월월차 포함)
     */
    @Scheduled(cron = "0 0 0 1 1 ?", zone = "Asia/Seoul")
    public void annualVacationScheduleGeneration() {
        int currentYear = LocalDate.now().getYear();
        int prevYear = currentYear - 1;
        log.info("=== [연간] accrual 일정 생성 시작 ({}년) ===", currentYear);

        // 전체 활성 사용자 1회만 조회하여 모든 Step에서 재활용
        List<User> activeUsers = userRepository.findAllActive();

        // Step 1: 신년도 accrual 일정 생성
        try {
            int scheduleCount = vacationService.generateAllVacationAccrualSchedules(currentYear, activeUsers);
            log.info("=== [연간] accrual 일정 생성 완료 - {}년, {}명 ===", currentYear, scheduleCount);
        } catch (Exception e) {
            log.error("[연간] accrual 일정 생성 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }

        // Step 2-4: 전년도 이월 처리 — 서비스 첫 해(2026)는 이전 데이터 없으므로 스킵
        if (prevYear >= 2026) {
            // Step 2: 전년도 balance 재계산 (잔여일수 확정)
            try {
                int prevBalanceCount = vacationService.computeAndSaveAllVacationBalances(prevYear, activeUsers);
                log.info("=== [연간] 전년도 balance 재계산 완료 - {}년, {}명 ===", prevYear, prevBalanceCount);
            } catch (Exception e) {
                log.error("[연간] 전년도 balance 재계산 실패 ({}년): {}", prevYear, e.getMessage(), e);
            }

            // Step 3: 전년도 → 신년도 월차 이월 (이월월차 레코드 생성)
            try {
                int carryCount = vacationService.performAllCarryOvers(prevYear, activeUsers);
                log.info("=== [연간] 월차 이월 처리 완료 - {}→{}년, {}명 ===", prevYear, currentYear, carryCount);
            } catch (Exception e) {
                log.error("[연간] 월차 이월 처리 실패 ({}→{}년): {}", prevYear, currentYear, e.getMessage(), e);
            }

            // Step 4: 전년도 balance 재계산 (carried_over_days 반영)
            try {
                vacationService.computeAndSaveAllVacationBalances(prevYear, activeUsers);
                log.info("=== [연간] 전년도 balance carried_over_days 반영 완료 - {}년 ===", prevYear);
            } catch (Exception e) {
                log.error("[연간] 전년도 balance carried_over_days 반영 실패 ({}년): {}", prevYear, e.getMessage(), e);
            }
        } else {
            log.info("=== [연간] 전년도 이월 처리 스킵 - 서비스 첫 해 (prevYear={}) ===", prevYear);
        }

        // Step 5: 신년도 balance 초기화 (이월월차 포함)
        try {
            int balanceCount = vacationService.computeAndSaveAllVacationBalances(currentYear, activeUsers);
            log.info("=== [연간] 신년도 balance 초기화 완료 - {}년, {}명 ===", currentYear, balanceCount);
        } catch (Exception e) {
            log.error("[연간] 신년도 balance 초기화 실패 ({}년): {}", currentYear, e.getMessage(), e);
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
     * Step 1. vacation_accrual_schedule (당해)
     *   - 전체 활성 사용자 대상 일정 생성 (deleteByUserIdxAndYear 후 재생성 — 멱등성 보장)
     *
     * Step 2. 전년도 balance 재계산
     *   - 이월 처리 전 잔여일수 확정
     *
     * Step 3. 전년도 → 당해 월차 이월
     *   - 이월월차(TYPE_CARRY_OVER) 레코드 생성 (멱등성 보장)
     *
     * Step 4. 전년도 balance 재계산 (carried_over_days 반영)
     *
     * Step 5. 당해 vacation_balance
     *   - 항상 전체 UPSERT (이월월차 포함)
     */
    @Scheduled(initialDelay = 15000, fixedDelay = Long.MAX_VALUE)
    public void initialVacationScheduleGeneration() {
        int currentYear = LocalDate.now().getYear();
        int prevYear = currentYear - 1;

        // 전체 활성 사용자 1회만 조회하여 모든 Step에서 재활용
        List<User> activeUsers = userRepository.findAllActive();

        // Step 1: 당해 accrual schedule — 항상 재생성 (멱등)
        log.info("=== [초기화] accrual 일정 생성 시작 ({}년) ===", currentYear);
        try {
            int scheduleCount = vacationService.generateAllVacationAccrualSchedules(currentYear, activeUsers);
            log.info("=== [초기화] accrual 일정 생성 완료 - {}년, {}명 ===", currentYear, scheduleCount);
        } catch (Exception e) {
            log.error("[초기화] accrual 일정 생성 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }

        // Step 2-4: 전년도 이월 처리 — 서비스 첫 해(2026)는 이전 데이터 없으므로 스킵
        if (prevYear >= 2026) {
            // Step 2: 전년도 balance 재계산 (이월 처리 전 잔여 확정)
            log.info("=== [초기화] 전년도 balance 재계산 시작 ({}년) ===", prevYear);
            try {
                int prevCount = vacationService.computeAndSaveAllVacationBalances(prevYear, activeUsers);
                log.info("=== [초기화] 전년도 balance 재계산 완료 - {}년, {}명 ===", prevYear, prevCount);
            } catch (Exception e) {
                log.error("[초기화] 전년도 balance 재계산 실패 ({}년): {}", prevYear, e.getMessage(), e);
            }

            // Step 3: 전년도 → 당해 월차 이월 (멱등)
            log.info("=== [초기화] 월차 이월 처리 시작 ({}→{}년) ===", prevYear, currentYear);
            try {
                int carryCount = vacationService.performAllCarryOvers(prevYear, activeUsers);
                log.info("=== [초기화] 월차 이월 처리 완료 - {}→{}년, {}명 ===", prevYear, currentYear, carryCount);
            } catch (Exception e) {
                log.error("[초기화] 월차 이월 처리 실패 ({}→{}년): {}", prevYear, currentYear, e.getMessage(), e);
            }

            // Step 4: 전년도 balance 재계산 (carried_over_days 반영)
            try {
                vacationService.computeAndSaveAllVacationBalances(prevYear, activeUsers);
                log.info("=== [초기화] 전년도 balance carried_over_days 반영 완료 - {}년 ===", prevYear);
            } catch (Exception e) {
                log.error("[초기화] 전년도 balance carried_over_days 반영 실패 ({}년): {}", prevYear, e.getMessage(), e);
            }
        } else {
            log.info("=== [초기화] 전년도 이월 처리 스킵 - 서비스 첫 해 (prevYear={}) ===", prevYear);
        }

        // Step 5: 당해 vacation_balance — 항상 UPSERT (이월월차 포함)
        log.info("=== [초기화] vacation_balance 계산 시작 ({}년) ===", currentYear);
        try {
            int balanceCount = vacationService.computeAndSaveAllVacationBalances(currentYear, activeUsers);
            log.info("=== [초기화] vacation_balance 계산 완료 - {}년, {}명 ===", currentYear, balanceCount);
        } catch (Exception e) {
            log.error("[초기화] vacation_balance 계산 실패 ({}년): {}", currentYear, e.getMessage(), e);
        }
    }
}
