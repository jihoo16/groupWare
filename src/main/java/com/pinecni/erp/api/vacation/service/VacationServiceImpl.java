package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.repository.VacationBalanceRepository;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.entity.VacationAccrualSchedule;
import com.pinecni.erp.entity.VacationBalance;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VacationServiceImpl implements VacationService {

    private final UserRepository userRepository;
    private final VacationAccrualScheduleRepository accrualScheduleRepository;
    private final VacationBalanceRepository vacationBalanceRepository;
    private final CodeRepository codeRepository;

    @Override
    @Transactional(readOnly = true)
    public VacationUserInfoDTO getUserVacationInfo(Long userIdx, Integer year) {
        log.info("[사용자 연차 정보 조회] userIdx: {}, year: {}", userIdx, year);

        // 1. 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));

        // 2. 연차 잔액 조회
        VacationBalance vacationBalance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, year)
                .orElse(null);

        // 3. 부서명 조회 (C01 그룹)
        String empDeptName = codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                .map(Code::getCodeName)
                .orElse(user.getEmpDept()); // 코드명을 찾지 못하면 코드 자체 반환

        // 4. 직급명 조회 (C02 그룹)
        String empPositionName = codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                .map(Code::getCodeName)
                .orElse(user.getEmpPosition()); // 코드명을 찾지 못하면 코드 자체 반환

        // 5. DTO 생성
        VacationUserInfoDTO dto = VacationUserInfoDTO.builder()
                .userIdx(user.getIdx())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empDeptName(empDeptName)
                .empPosition(user.getEmpPosition())
                .empPositionName(empPositionName)
                .empAddress(user.getEmpAddress())
                .empBirth(user.getEmpBirth() != null ? user.getEmpBirth().format(DateTimeFormatter.ISO_DATE) : null)
                .empPhone(user.getEmpPhone())
                .year(year)
                .totalDays(vacationBalance != null ? vacationBalance.getTotalDays() : BigDecimal.ZERO)
                .usedDays(vacationBalance != null ? vacationBalance.getUsedDays() : BigDecimal.ZERO)
                .remainingDays(vacationBalance != null ? vacationBalance.getRemainingDays() : BigDecimal.ZERO)
                .build();

        log.info("[사용자 연차 정보 조회 완료] empName: {}, totalDays: {}, usedDays: {}, remainingDays: {}",
                dto.getEmpName(), dto.getTotalDays(), dto.getUsedDays(), dto.getRemainingDays());

        return dto;
    }

    @Override
    @Transactional
    public void generateVacationAccrualSchedule(Long userIdx, Integer year, Long operatorUserIdx) {
        log.info("[연차 발생 일정 생성] userIdx: {}, year: {}", userIdx, year);

        // 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));

        LocalDate joinDate = user.getEmpJoinDate();
        if (joinDate == null) {
            throw new IllegalStateException("입사일이 설정되지 않은 사용자입니다: " + userIdx);
        }

        // 기존 발생 일정 삭제
        accrualScheduleRepository.deleteByUserIdxAndYear(userIdx, year);

        // 1년일 계산
        LocalDate oneYearAnniversary = joinDate.plusYears(1);
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year, 12, 31);

        // 연초 기준 근속연수
        long yearsOfServiceAtYearStart = ChronoUnit.YEARS.between(joinDate, yearStart);

        List<VacationAccrualSchedule> schedules = new ArrayList<>();

        // === Case 1: 1년 이상 근속자 ===
        if (yearsOfServiceAtYearStart >= 1) {
            // 1월 1일: 기본 15일 발생
            schedules.add(createAccrual(userIdx, year, yearStart,
                    VacationAccrualSchedule.TYPE_BASE, new BigDecimal("15.0"),
                    "기본 연차 15일", operatorUserIdx));

            // 입사일 기준 만 2년, 4년, 6년... 근속가산 발생
            for (int seniorityYear = 2; seniorityYear <= 20; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.getYear() == year) {
                    int bonusDays = seniorityYear / 2;
                    if (bonusDays > 10) bonusDays = 10; // 최대 10일

                    schedules.add(createAccrual(userIdx, year, seniorityDate,
                            VacationAccrualSchedule.TYPE_SENIORITY, new BigDecimal(bonusDays),
                            "만 " + seniorityYear + "년 근속 가산", operatorUserIdx));
                }
            }
        }
        // === Case 2: 1년 초과하는 해 ===
        else if (oneYearAnniversary.getYear() == year) {
            // 월차: 매월 입사일+1에 1일 발생 (1월 ~ 1년 전월까지)
            int monthlyEndMonth = oneYearAnniversary.getMonthValue() - 1;
            for (int month = 1; month <= monthlyEndMonth; month++) {
                LocalDate monthlyDate = LocalDate.of(year, month, joinDate.getDayOfMonth() + 1);
                // 날짜 유효성 검사 (예: 2월 30일 -> 2월 말일)
                if (monthlyDate.getMonthValue() != month) {
                    monthlyDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
                }

                schedules.add(createAccrual(userIdx, year, monthlyDate,
                        VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                        month + "월 만근 월차", operatorUserIdx));
            }

            // 비례 연차: 1년일에 발생
            long daysInYear = yearEnd.isLeapYear() ? 366 : 365;
            long remainingDays = ChronoUnit.DAYS.between(oneYearAnniversary, yearEnd) + 1;
            BigDecimal proportionalDays = new BigDecimal(remainingDays)
                    .divide(new BigDecimal(daysInYear), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("15"))
                    .setScale(1, RoundingMode.HALF_UP);

            schedules.add(createAccrual(userIdx, year, oneYearAnniversary,
                    VacationAccrualSchedule.TYPE_PROPORTIONAL, proportionalDays,
                    "비례 연차 (1년일~12/31)", operatorUserIdx));
        }
        // === Case 3: 1년 미만 ===
        else {
            int joinMonth = joinDate.getMonthValue();
            int joinDay = joinDate.getDayOfMonth();

            // 입사 연도인 경우: 입사월+1 ~ 12월
            if (joinDate.getYear() == year) {
                for (int month = joinMonth + 1; month <= 12; month++) {
                    LocalDate monthlyDate = LocalDate.of(year, month, joinDay + 1);
                    // 날짜 유효성 검사
                    if (monthlyDate.getMonthValue() != month) {
                        monthlyDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
                    }

                    schedules.add(createAccrual(userIdx, year, monthlyDate,
                            VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                            month + "월 만근 월차", operatorUserIdx));
                }
            }
            // 입사 다음 해이지만 1년 미만: 1월 ~ 12월
            else if (oneYearAnniversary.getYear() > year) {
                for (int month = 1; month <= 12; month++) {
                    LocalDate monthlyDate = LocalDate.of(year, month, joinDay + 1);
                    // 날짜 유효성 검사
                    if (monthlyDate.getMonthValue() != month) {
                        monthlyDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
                    }

                    schedules.add(createAccrual(userIdx, year, monthlyDate,
                            VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                            month + "월 만근 월차", operatorUserIdx));
                }
            }
        }

        // 일괄 저장
        if (!schedules.isEmpty()) {
            accrualScheduleRepository.saveAll(schedules);
            log.info("[연차 발생 일정 생성 완료] userIdx: {}, year: {}, 발생 건수: {}",
                    userIdx, year, schedules.size());
        }
    }

    @Override
    @Transactional
    public int generateAllVacationAccrualSchedules(Integer year) {
        log.info("[전체 연차 발생 일정 생성] year: {}", year);

        // 재직 중인 모든 사용자 조회
        List<User> activeUsers = userRepository.findAllActive();

        int count = 0;
        for (User user : activeUsers) {
            try {
                generateVacationAccrualSchedule(user.getIdx(), year, 1L); // operatorUserIdx = 1 (시스템)
                count++;
            } catch (Exception e) {
                log.error("[연차 발생 일정 생성 실패] userIdx: {}, error: {}", user.getIdx(), e.getMessage());
            }
        }

        log.info("[전체 연차 발생 일정 생성 완료] year: {}, 처리: {}명", year, count);
        return count;
    }

    @Override
    @Transactional
    public int processDailyAccruals(LocalDate targetDate) {
        log.info("[일일 연차 발생 처리] date: {}", targetDate);

        int count = 0;
        List<User> activeUsers = userRepository.findAllActive();

        for (User user : activeUsers) {
            LocalDate joinDate = user.getEmpJoinDate();
            if (joinDate == null) continue;

            int year = targetDate.getYear();
            int joinDay = joinDate.getDayOfMonth();
            LocalDate oneYearAnniversary = joinDate.plusYears(1);
            long yearsOfServiceAtYearStart = ChronoUnit.YEARS.between(joinDate, LocalDate.of(year, 1, 1));

            List<VacationAccrualSchedule> todayAccruals = new ArrayList<>();

            // 1. 기본 연차 발생 (1월 1일, 1년 이상 근속자)
            if (targetDate.getMonthValue() == 1 && targetDate.getDayOfMonth() == 1 && yearsOfServiceAtYearStart >= 1) {
                if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                        user.getIdx(), year, targetDate, VacationAccrualSchedule.TYPE_BASE)) {
                    todayAccruals.add(createAccrual(user.getIdx(), year, targetDate,
                            VacationAccrualSchedule.TYPE_BASE, new BigDecimal("15.0"),
                            "기본 연차 15일", 1L));
                }
            }

            // 2. 근속가산 발생 (입사일 기준 만 2년, 4년, 6년...)
            for (int seniorityYear = 2; seniorityYear <= 20; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.equals(targetDate)) {
                    int bonusDays = seniorityYear / 2;
                    if (bonusDays > 10) bonusDays = 10;

                    if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                            user.getIdx(), year, targetDate, VacationAccrualSchedule.TYPE_SENIORITY)) {
                        todayAccruals.add(createAccrual(user.getIdx(), year, targetDate,
                                VacationAccrualSchedule.TYPE_SENIORITY, new BigDecimal(bonusDays),
                                "만 " + seniorityYear + "년 근속 가산", 1L));
                    }
                }
            }

            // 3. 월차 발생 (매월 입사일+1, 간소화: 만근 가정)
            if (targetDate.getDayOfMonth() == joinDay + 1) {
                boolean shouldAccrue = false;

                // Case 2: 1년 초과하는 해
                if (oneYearAnniversary.getYear() == year) {
                    int monthlyEndMonth = oneYearAnniversary.getMonthValue() - 1;
                    if (targetDate.getMonthValue() <= monthlyEndMonth) {
                        shouldAccrue = true;
                    }
                }
                // Case 3: 1년 미만
                else if (yearsOfServiceAtYearStart < 1) {
                    // 입사 연도: 입사월+1 ~ 12월
                    if (joinDate.getYear() == year && targetDate.getMonthValue() > joinDate.getMonthValue()) {
                        shouldAccrue = true;
                    }
                    // 입사 다음 해: 1월 ~ 12월
                    else if (oneYearAnniversary.getYear() > year && joinDate.getYear() < year) {
                        shouldAccrue = true;
                    }
                }

                if (shouldAccrue && !accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                        user.getIdx(), year, targetDate, VacationAccrualSchedule.TYPE_MONTHLY)) {
                    todayAccruals.add(createAccrual(user.getIdx(), year, targetDate,
                            VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                            targetDate.getMonthValue() + "월 만근 월차", 1L));
                }
            }

            // 4. 비례 연차 발생 (1년일)
            if (oneYearAnniversary.equals(targetDate)) {
                LocalDate yearEnd = LocalDate.of(year, 12, 31);
                long daysInYear = yearEnd.isLeapYear() ? 366 : 365;
                long remainingDays = ChronoUnit.DAYS.between(oneYearAnniversary, yearEnd) + 1;
                BigDecimal proportionalDays = new BigDecimal(remainingDays)
                        .divide(new BigDecimal(daysInYear), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("15"))
                        .setScale(1, RoundingMode.HALF_UP);

                if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                        user.getIdx(), year, targetDate, VacationAccrualSchedule.TYPE_PROPORTIONAL)) {
                    todayAccruals.add(createAccrual(user.getIdx(), year, targetDate,
                            VacationAccrualSchedule.TYPE_PROPORTIONAL, proportionalDays,
                            "비례 연차 (1년일~12/31)", 1L));
                }
            }

            // 저장
            if (!todayAccruals.isEmpty()) {
                accrualScheduleRepository.saveAll(todayAccruals);
                count += todayAccruals.size();
            }
        }

        log.info("[일일 연차 발생 처리 완료] date: {}, 발생 건수: {}", targetDate, count);
        return count;
    }

    /**
     * 연차 발생 일정 생성 헬퍼 메서드
     */
    private VacationAccrualSchedule createAccrual(Long userIdx, Integer year, LocalDate accrualDate,
                                                   String accrualType, BigDecimal days,
                                                   String description, Long operatorUserIdx) {
        return VacationAccrualSchedule.builder()
                .userIdx(userIdx)
                .year(year)
                .accrualDate(accrualDate)
                .accrualType(accrualType)
                .days(days)
                .description(description)
                .createdUserIdx(operatorUserIdx)
                .build();
    }
}
