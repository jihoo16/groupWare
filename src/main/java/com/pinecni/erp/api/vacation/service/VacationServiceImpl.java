package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.calendar.repository.CalendarEventRepository;
import com.pinecni.erp.api.calendar.repository.CalendarParticipantRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.dto.VacationCalculationDetailDTO;
import com.pinecni.erp.api.vacation.dto.VacationRequestSaveDTO;
import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.repository.VacationBalanceRepository;
import com.pinecni.erp.api.vacation.repository.VacationRequestRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VacationServiceImpl implements VacationService {

    private final UserRepository userRepository;
    private final VacationAccrualScheduleRepository accrualScheduleRepository;
    private final VacationBalanceRepository vacationBalanceRepository;
    private final VacationRequestRepository vacationRequestRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final CodeRepository codeRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final CalendarParticipantRepository calendarParticipantRepository;
    private final com.pinecni.erp.api.calendar.service.HolidayService holidayService;

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
        String empDeptName = codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                .map(Code::getCodeName)
                .orElse(user.getEmpDept()); // 코드명을 찾지 못하면 코드 자체 반환

        // 4. 직급명 조회 (C02 그룹)
        String empPositionName = codeRepository.findByGroupCodeAndCode(CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
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

    @Override
    @Transactional(readOnly = true)
    public VacationCalculationDetailDTO getVacationCalculationDetail(Long userIdx, Integer year) {
        log.info("[연차 계산 상세 조회] userIdx: {}, year: {}", userIdx, year);

        // 1. 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));

        LocalDate joinDate = user.getEmpJoinDate();
        if (joinDate == null) {
            throw new IllegalStateException("입사일이 설정되지 않은 사용자입니다: " + userIdx);
        }

        // 2. 계산 기준일 (올해: 오늘, 과거/미래: 해당 연도 12월 31일)
        LocalDate calculationBaseDate;
        int currentYear = LocalDate.now().getYear();
        if (year == currentYear) {
            calculationBaseDate = LocalDate.now();
            log.info("[계산 기준일] 올해이므로 오늘 날짜 사용: {}", calculationBaseDate);
        } else {
            calculationBaseDate = LocalDate.of(year, 12, 31);
            log.info("[계산 기준일] {}년 말일 사용: {}", year, calculationBaseDate);
        }
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // 3. 근속 연수 및 개월 수 계산
        long totalMonths = ChronoUnit.MONTHS.between(joinDate, calculationBaseDate);
        int yearsOfService = (int) (totalMonths / 12);
        int monthsOfService = (int) (totalMonths % 12);

        // 4. 1년일 계산
        LocalDate oneYearAnniversary = joinDate.plusYears(1);
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year, 12, 31);

        // 5. 연초 기준 근속연수
        long yearsOfServiceAtYearStart = ChronoUnit.YEARS.between(joinDate, yearStart);

        VacationCalculationDetailDTO.VacationCalculationDetailDTOBuilder builder = VacationCalculationDetailDTO.builder()
                .joinDate(joinDate.format(formatter))
                .calculationBaseDate(calculationBaseDate.format(formatter))
                .year(year)
                .yearsOfService(yearsOfService)
                .monthsOfService(monthsOfService)
                // 기본값 설정 (null 방지)
                .baseVacationDays(BigDecimal.ZERO)
                .serviceBonusDays(BigDecimal.ZERO)
                .monthlyVacationDays(BigDecimal.ZERO)
                .proportionalVacationDays(BigDecimal.ZERO);

        BigDecimal totalDays = BigDecimal.ZERO;

        // === Case 1: 1년 이상 근속자 ===
        if (yearsOfServiceAtYearStart >= 1) {
            log.info("[1년 이상 근속자] yearsOfServiceAtYearStart: {}", yearsOfServiceAtYearStart);

            builder.isFirstYear(false);
            builder.baseVacationDays(new BigDecimal("15.0"));
            totalDays = totalDays.add(new BigDecimal("15.0"));

            // 근속가산 연차 계산 (만 2년, 4년, 6년... 누적)
            // 1. 연초(1월 1일) 기준으로 이미 누적된 근속가산 계산
            int accumulatedBonusDays = 0;
            for (int seniorityYear = 2; seniorityYear <= 20; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.isBefore(yearStart) || seniorityDate.equals(yearStart)) {
                    accumulatedBonusDays++;
                    if (accumulatedBonusDays >= 10) {
                        accumulatedBonusDays = 10; // 최대 10일
                        break;
                    }
                }
            }

            // 2. 해당 연도 중에 새로 발생하는 근속가산 확인
            LocalDate newServiceBonusDate = null;
            String newServiceBonusDesc = null;
            int newBonusDays = 0;

            for (int seniorityYear = 2; seniorityYear <= 20; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.getYear() == year && accumulatedBonusDays < 10) {
                    newBonusDays = 1; // 해당 연도에 추가되는 일수
                    newServiceBonusDate = seniorityDate;
                    newServiceBonusDesc = "만 " + seniorityYear + "년 근속 가산";
                    break;
                }
            }

            // 3. 총 근속가산 = 누적 + 신규
            int totalServiceBonusDays = accumulatedBonusDays + newBonusDays;
            if (totalServiceBonusDays > 10) totalServiceBonusDays = 10; // 최대 10일

            builder.serviceBonusDays(new BigDecimal(totalServiceBonusDays));
            totalDays = totalDays.add(new BigDecimal(totalServiceBonusDays));

            // 4. 해당 연도에 새로 발생하는 근속가산 정보 설정 (모달 표시용)
            if (newServiceBonusDate != null) {
                builder.serviceBonusAccrualDate(newServiceBonusDate.format(formatter));
                builder.serviceBonusDescription(newServiceBonusDesc + " (누적: " + accumulatedBonusDays + "일 → " + totalServiceBonusDays + "일)");
            } else if (totalServiceBonusDays > 0) {
                // 해당 연도에 발생하는 근속가산이 없지만 누적된 게 있는 경우
                builder.serviceBonusDescription("근속가산 연차 (누적: " + totalServiceBonusDays + "일)");
            }

            log.info("[근속가산 계산] 연초 누적: {}일, 신규 발생: {}일, 총: {}일",
                    accumulatedBonusDays, newBonusDays, totalServiceBonusDays);
        }
        // === Case 2: 1년 초과하는 해 ===
        else if (oneYearAnniversary.getYear() == year) {
            log.info("[1년 초과하는 해] oneYearAnniversary: {}", oneYearAnniversary);

            builder.isFirstYear(false);

            // 1. 월차 계산: 1월 ~ 1년일 전월까지
            int monthlyEndMonth = oneYearAnniversary.getMonthValue() - 1;
            BigDecimal monthlyDays = new BigDecimal(monthlyEndMonth > 0 ? monthlyEndMonth : 0);
            builder.monthlyVacationDays(monthlyDays);
            if (monthlyEndMonth > 0) {
                builder.monthlyStartMonth(1);
                builder.monthlyEndMonth(monthlyEndMonth);
            }
            totalDays = totalDays.add(monthlyDays);

            // 2. 비례 연차: 1년일부터 연말까지
            // 한국 근로기준법: 전년도 근로일수 비례하여 기본연차 지급
            // 출근율 100% 가정
            // 계산식: (전년도 근로 일수 / 전년도 전체 일수) × 15일 (반올림)

            // 전년도 = 입사 연도
            int previousYear = joinDate.getYear();
            LocalDate previousYearEnd = LocalDate.of(previousYear, 12, 31);
            long daysInPreviousYear = previousYearEnd.isLeapYear() ? 366 : 365;

            // 전년도 근로 일수 = 입사일부터 전년도 연말까지
            long workedDaysInPreviousYear = ChronoUnit.DAYS.between(joinDate, previousYearEnd) + 1;

            BigDecimal proportionalDays = new BigDecimal(workedDaysInPreviousYear)
                    .divide(new BigDecimal(daysInPreviousYear), 2, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("15"))
                    .setScale(0, RoundingMode.HALF_UP); // 반올림하여 정수로

            builder.proportionalVacationDays(proportionalDays);
            builder.proportionalStartDate(oneYearAnniversary.format(formatter));
            builder.baseVacationDays(proportionalDays); // 기본연차 = 비례연차
            totalDays = totalDays.add(proportionalDays);

            log.info("[1년일 도래] 1년일: {}, 월차: {}일(1~{}월), 전년도 근로일수: {}일/{}일, 비례연차: {}일, 총: {}일",
                    oneYearAnniversary, monthlyDays, monthlyEndMonth,
                    workedDaysInPreviousYear, daysInPreviousYear, proportionalDays, totalDays);
        }
        // === Case 3: 1년 미만 ===
        else {
            log.info("[1년 미만] joinDate: {}, oneYearAnniversary: {}", joinDate, oneYearAnniversary);

            builder.isFirstYear(true);

            int joinMonth = joinDate.getMonthValue();

            // 입사 연도인 경우: 입사월+1 ~ 12월
            int monthlyCount = 0;
            if (joinDate.getYear() == year) {
                monthlyCount = 12 - joinMonth;
                builder.monthlyStartMonth(joinMonth + 1);
                builder.monthlyEndMonth(12);
            }
            // 입사 다음 해이지만 1년 미만: 1월 ~ 12월
            else if (oneYearAnniversary.getYear() > year) {
                monthlyCount = 12;
                builder.monthlyStartMonth(1);
                builder.monthlyEndMonth(12);
            }

            BigDecimal monthlyDays = new BigDecimal(monthlyCount);
            builder.monthlyVacationDays(monthlyDays);
            totalDays = totalDays.add(monthlyDays);
        }

        builder.totalVacationDays(totalDays);

        VacationCalculationDetailDTO result = builder.build();
        log.info("[연차 계산 상세 조회 완료] totalDays: {}", totalDays);

        return result;
    }

    @Override
    @Transactional
    public Long saveVacationRequest(Long userIdx, VacationRequestSaveDTO saveDTO) {
        log.info("[연차 신청서 저장] userIdx: {}, periods count: {}", userIdx, saveDTO.getPeriods().size());

        try {
            // 1. 사용자 조회
            User user = userRepository.findById(userIdx)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));

        // ===== 🔒 보안 검증 시작 =====
        log.info("[보안 검증 시작] userIdx: {}", userIdx);

        // 2. 기본 입력값 검증
        if (saveDTO.getPeriods() == null || saveDTO.getPeriods().isEmpty()) {
            throw new IllegalArgumentException("연차 기간이 지정되지 않았습니다.");
        }

        // 3. 중복 날짜 검증 (이미 신청된 날짜와 겹치는지)
        validateNoDuplicateDates(userIdx, saveDTO.getPeriods());

        // 4. 신청 일수 검증 (프론트엔드에서 계산한 값과 백엔드 재계산 값 비교)
        validateRequestedDays(saveDTO.getPeriods());

        // 5. 총 신청 일수 계산
        BigDecimal totalRequestedDays = saveDTO.getPeriods().stream()
                .map(VacationRequestSaveDTO.VacationPeriod::getDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 6. 잔여 연차 검증
        validateRemainingVacation(userIdx, totalRequestedDays, saveDTO.getAllowMinusVacation());

        log.info("[보안 검증 완료] ✓ 중복 날짜 없음, ✓ 일수 정확, ✓ 잔여 연차 충분 (총 신청: {}일)", totalRequestedDays);
        // ===== 🔒 보안 검증 완료 =====

        // 7. 현재 연차 잔액 조회
        int currentYear = LocalDate.now().getYear();
        VacationBalance vacationBalance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, currentYear)
                .orElse(null);

        BigDecimal remainingDays = vacationBalance != null ? vacationBalance.getRemainingDays() : BigDecimal.ZERO;

        // 8. ApprovalDocument 생성 (문서 메타데이터)
        // 문서 제목: "연차 신청서 - {첫 번째 기간 시작일}"
        String title = "연차 신청서";
        if (!saveDTO.getPeriods().isEmpty()) {
            LocalDate firstStartDate = saveDTO.getPeriods().get(0).getStartDate();
            title = "연차 신청서 - " + firstStartDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        }

        // 문서번호 생성 (임시: VAC-{timestamp}-{userIdx})
        String documentNo = "VAC-" + System.currentTimeMillis() + "-" + userIdx;

        ApprovalDocument document = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType("연차신청서")
                .drafterUserIdx(userIdx)
                .content(saveDTO.getReason())
                .createdUserIdx(userIdx)
                .updatedUserIdx(userIdx)
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(document);
        log.info("[문서 메타데이터 저장 완료] documentIdx: {}, documentNo: {}", savedDocument.getIdx(), savedDocument.getDocumentNo());

        // 9. VacationRequest 생성 (각 기간별로 개별 저장)
        for (VacationRequestSaveDTO.VacationPeriod period : saveDTO.getPeriods()) {
            VacationRequest vacationRequest = VacationRequest.builder()
                    .userIdx(userIdx)
                    .documentIdx(savedDocument.getIdx())
                    .vacationType(period.getVacationType())
                    .startDate(period.getStartDate())
                    .endDate(period.getEndDate())
                    .days(period.getDays())
                    .remainingDaysAtApply(remainingDays)
                    .reason(saveDTO.getReason())
                    .allowMinusVacation(saveDTO.getAllowMinusVacation() != null ? saveDTO.getAllowMinusVacation() : false)
                    .specialApprovalReason(saveDTO.getSpecialApprovalReason())
                    .applyDate(LocalDate.now())
                    .createdUserIdx(userIdx)
                    .updatedUserIdx(userIdx)
                    .build();

            vacationRequestRepository.save(vacationRequest);
            log.info("[연차 기간 저장] startDate: {}, endDate: {}, days: {}, type: {}",
                    period.getStartDate(), period.getEndDate(), period.getDays(), period.getVacationType());

            // 10. 캘린더 일정 자동 생성
            createCalendarEventForVacation(userIdx, user, savedDocument.getIdx(), period, saveDTO.getReason());
        }

            log.info("[연차 신청서 저장 완료] documentIdx: {}, total periods: {}", savedDocument.getIdx(), saveDTO.getPeriods().size());
            return savedDocument.getIdx();

        } catch (IllegalArgumentException e) {
            // 비즈니스 검증 실패 (사용자 친화적 에러 메시지)
            log.error("[연차 신청 실패 - 검증 오류] userIdx: {}, error: {}", userIdx, e.getMessage());
            throw e;
        } catch (Exception e) {
            // 시스템 에러 (DB 저장 실패 등)
            log.error("[연차 신청 실패 - 시스템 오류] userIdx: {}, error: {}", userIdx, e.getMessage(), e);
            throw new RuntimeException("연차 신청서 저장 중 오류가 발생했습니다. approval_documents, vacation_request, calendar_events가 모두 롤백됩니다.", e);
        }
    }

    /**
     * 연차 신청 시 캘린더 일정 자동 생성
     */
    private void createCalendarEventForVacation(Long userIdx, User user, Long documentIdx,
                                                VacationRequestSaveDTO.VacationPeriod period, String reason) {
        try {
            // 연차 유형에 따른 이벤트 제목 생성
            String eventTitle = getVacationTypeTitle(period.getVacationType(), user.getEmpName());
            String groupId = UUID.randomUUID().toString();

            // CalendarEvent 생성
            CalendarEvent calendarEvent = CalendarEvent.builder()
                    .eventTitle(eventTitle)
                    .eventType("leave") // 연차 일정 타입
                    .eventDescription(reason)
                    .startDate(period.getStartDate())
                    .endDate(period.getEndDate())
                    .startTime(null) // 종일 일정
                    .endTime(null) // 종일 일정
                    .isAllDay(true) // 종일 일정
                    .location(null)
                    .approvalIdx(documentIdx) // 결재 문서와 연결
                    .groupId(groupId)
                    .teamIdx(null) // 개인 일정
                    .notificationYn("N")
                    .notificationMinutes(null)
                    .isRecurring(false)
                    .recurringType(null)
                    .recurringEndDate(null)
                    .status("ACTIVE")
                    .createdAt(LocalDateTime.now())
                    .createdUserIdx(userIdx)
                    .updatedAt(LocalDateTime.now())
                    .updatedUserIdx(userIdx)
                    .build();

            CalendarEvent savedEvent = calendarEventRepository.save(calendarEvent);
            log.info("[캘린더 일정 생성] eventIdx: {}, eventTitle: {}, startDate: {}, endDate: {}",
                    savedEvent.getIdx(), eventTitle, period.getStartDate(), period.getEndDate());

            // CalendarParticipant 생성 (신청자를 참석자로 추가)
            CalendarParticipant participant = CalendarParticipant.builder()
                    .eventIdx(savedEvent.getIdx())
                    .userIdx(userIdx)
                    .userName(user.getEmpName())
                    .participationStatus("PENDING") // 기본값 사용
                    .receiveNotification("Y")
                    .createdAt(LocalDateTime.now())
                    .build();

            calendarParticipantRepository.save(participant);
            log.info("[캘린더 참석자 추가] userIdx: {}, userName: {}", userIdx, user.getEmpName());

        } catch (Exception e) {
            log.error("[캘린더 일정 생성 실패] userIdx: {}, error: {}", userIdx, e.getMessage(), e);
            // 캘린더 일정 생성 실패해도 연차 신청은 진행되도록 예외를 삼킴
        }
    }

    /**
     * 연차 유형에 따른 이벤트 제목 생성
     */
    private String getVacationTypeTitle(String vacationType, String empName) {
        String typeLabel;
        switch (vacationType) {
            case "annual":
                typeLabel = "연차";
                break;
            case "half-morning":
                typeLabel = "오전 반차";
                break;
            case "half-afternoon":
                typeLabel = "오후 반차";
                break;
            case "sick":
                typeLabel = "병가";
                break;
            case "special":
                typeLabel = "특별휴가";
                break;
            default:
                typeLabel = "휴가";
                break;
        }
        return empName + " " + typeLabel;
    }

    // ============================================
    // 보안 검증 메서드
    // ============================================

    /**
     * 영업일 일수 계산 (주말/공휴일 제외)
     * 프론트엔드에서 계산한 값과 비교하기 위해 사용
     */
    private BigDecimal calculateBusinessDays(LocalDate startDate, LocalDate endDate, String vacationType) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("시작일과 종료일은 필수입니다.");
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("시작일이 종료일보다 늦을 수 없습니다.");
        }

        // 반차 처리
        if ("반차(오전)".equals(vacationType) || "반차(오후)".equals(vacationType)) {
            // 반차는 0.5일로 고정
            return new BigDecimal("0.5");
        }

        // 공휴일 데이터를 년도별로 캐싱하여 조회 (성능 최적화)
        Map<Integer, Map<String, String>> holidaysByYear = new HashMap<>();

        BigDecimal businessDays = BigDecimal.ZERO;
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            // 주말 확인
            boolean isWeekend = (current.getDayOfWeek().getValue() == 6 || // 토요일
                                 current.getDayOfWeek().getValue() == 7);  // 일요일

            // 공휴일 확인 (년도별 캐시 활용)
            int year = current.getYear();
            if (!holidaysByYear.containsKey(year)) {
                holidaysByYear.put(year, holidayService.getHolidaysByYear(year));
            }
            boolean isHoliday = holidaysByYear.get(year).containsKey(current.toString());

            // 영업일인 경우만 카운트
            if (!isWeekend && !isHoliday) {
                businessDays = businessDays.add(BigDecimal.ONE);
            }

            current = current.plusDays(1);
        }

        return businessDays;
    }

    /**
     * 이미 신청된 날짜와 겹치는지 확인
     */
    private void validateNoDuplicateDates(Long userIdx, List<VacationRequestSaveDTO.VacationPeriod> periods) {
        // 현재 연도의 모든 연차 신청 내역 조회
        int currentYear = LocalDate.now().getYear();
        List<VacationRequest> existingRequests = vacationRequestRepository.findByUserIdxAndYear(userIdx, currentYear);

        // 기존 신청 날짜들을 Set에 저장
        Set<LocalDate> existingDates = new HashSet<>();
        for (VacationRequest request : existingRequests) {
            LocalDate current = request.getStartDate();
            while (!current.isAfter(request.getEndDate())) {
                existingDates.add(current);
                current = current.plusDays(1);
            }
        }

        // 새로운 신청 날짜들과 비교
        for (VacationRequestSaveDTO.VacationPeriod period : periods) {
            LocalDate current = period.getStartDate();
            while (!current.isAfter(period.getEndDate())) {
                if (existingDates.contains(current)) {
                    throw new IllegalStateException(
                        String.format("이미 연차 신청된 날짜입니다: %s", current)
                    );
                }
                current = current.plusDays(1);
            }
        }
    }

    /**
     * 신청 일수 검증 (프론트엔드에서 계산한 값과 백엔드 재계산 값 비교)
     */
    private void validateRequestedDays(List<VacationRequestSaveDTO.VacationPeriod> periods) {
        for (VacationRequestSaveDTO.VacationPeriod period : periods) {
            // 백엔드에서 재계산
            BigDecimal calculatedDays = calculateBusinessDays(
                period.getStartDate(),
                period.getEndDate(),
                period.getVacationType()
            );

            // 프론트엔드에서 보낸 값과 비교 (오차 범위 0.1일)
            BigDecimal difference = period.getDays().subtract(calculatedDays).abs();
            if (difference.compareTo(new BigDecimal("0.1")) > 0) {
                throw new IllegalArgumentException(
                    String.format("신청 일수가 올바르지 않습니다. 기간: %s ~ %s, 신청: %s일, 계산: %s일",
                        period.getStartDate(), period.getEndDate(),
                        period.getDays(), calculatedDays)
                );
            }

            log.info("[일수 검증 통과] 기간: {} ~ {}, 신청: {}일, 계산: {}일",
                period.getStartDate(), period.getEndDate(), period.getDays(), calculatedDays);
        }
    }

    /**
     * 잔여 연차 검증 (마이너스 연차 허용 여부 확인)
     */
    private void validateRemainingVacation(Long userIdx, BigDecimal totalRequestedDays,
                                           Boolean allowMinusVacation) {
        int currentYear = LocalDate.now().getYear();
        VacationBalance vacationBalance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, currentYear)
            .orElse(null);

        BigDecimal remainingDays = vacationBalance != null ?
            vacationBalance.getRemainingDays() : BigDecimal.ZERO;

        // 잔여 연차 부족 시
        if (totalRequestedDays.compareTo(remainingDays) > 0) {
            // 마이너스 연차 허용하지 않는 경우
            if (allowMinusVacation == null || !allowMinusVacation) {
                throw new IllegalStateException(
                    String.format("잔여 연차가 부족합니다. 잔여: %s일, 신청: %s일",
                        remainingDays, totalRequestedDays)
                );
            }

            // 마이너스 연차 허용하는 경우 - 로그만 남김
            log.warn("[마이너스 연차 사용] userIdx: {}, 잔여: {}일, 신청: {}일, 초과: {}일",
                userIdx, remainingDays, totalRequestedDays,
                totalRequestedDays.subtract(remainingDays));
        } else {
            log.info("[잔여 연차 검증 통과] userIdx: {}, 잔여: {}일, 신청: {}일",
                userIdx, remainingDays, totalRequestedDays);
        }
    }
}
