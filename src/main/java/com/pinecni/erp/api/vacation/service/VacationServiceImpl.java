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
import com.pinecni.erp.api.vacation.repository.VacationOfficialPdfRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import com.pinecni.erp.service.PdfGenerationService;
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
    private final VacationOfficialPdfRepository vacationOfficialPdfRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final CodeRepository codeRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final CalendarParticipantRepository calendarParticipantRepository;
    private final com.pinecni.erp.api.calendar.service.HolidayService holidayService;
    private final PdfGenerationService pdfGenerationService;

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

        // 4. 본인결혼 휴가 중복 신청 검증 (인생에 한 번만 가능)
        validateMarriageLeave(userIdx, saveDTO.getPeriods());

        // 5. 신청 일수 검증 (프론트엔드에서 계산한 값과 백엔드 재계산 값 비교)
        validateRequestedDays(saveDTO.getPeriods());

        // 6. 총 신청 일수 계산
        BigDecimal totalRequestedDays = saveDTO.getPeriods().stream()
                .map(VacationRequestSaveDTO.VacationPeriod::getDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 7. 잔여 연차 검증 (경조사와 기타는 연차 차감 대상이 아니므로 제외)
        BigDecimal totalRequestedDaysExcludingGyeongjosa = saveDTO.getPeriods().stream()
                .filter(period -> !period.getVacationType().contains("경조사") && !"기타".equals(period.getVacationType()))
                .map(VacationRequestSaveDTO.VacationPeriod::getDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        validateRemainingVacation(userIdx, totalRequestedDaysExcludingGyeongjosa, saveDTO.getAllowMinusVacation());

        log.info("[보안 검증 완료] ✓ 중복 날짜 없음, ✓ 본인결혼 중복 없음, ✓ 일수 정확, ✓ 잔여 연차 충분 (총 신청: {}일)", totalRequestedDays);
        // ===== 🔒 보안 검증 완료 =====

        // 8. 현재 연차 잔액 조회
        int currentYear = LocalDate.now().getYear();
        VacationBalance vacationBalance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, currentYear)
                .orElse(null);

        BigDecimal currentRemainingDays = vacationBalance != null ? vacationBalance.getRemainingDays() : BigDecimal.ZERO;

        // 신청 후 잔여 연차 계산 (경조사와 기타는 연차 차감 대상이 아니므로 제외)
        BigDecimal remainingDaysAfterApply = currentRemainingDays.subtract(totalRequestedDaysExcludingGyeongjosa);

        // 9. ApprovalDocument 생성 (문서 메타데이터)
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
                .isProject(false)
                .content(saveDTO.getReason())
                .createdUserIdx(userIdx)
                .updatedUserIdx(userIdx)
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(document);
        log.info("[문서 메타데이터 저장 완료] documentIdx: {}, documentNo: {}", savedDocument.getIdx(), savedDocument.getDocumentNo());

        // 10. VacationRequest 생성 (각 기간별로 개별 저장)
        for (VacationRequestSaveDTO.VacationPeriod period : saveDTO.getPeriods()) {
            VacationRequest vacationRequest = VacationRequest.builder()
                    .userIdx(userIdx)
                    .documentIdx(savedDocument.getIdx())
                    .vacationType(period.getVacationType())
                    .startDate(period.getStartDate())
                    .endDate(period.getEndDate())
                    .days(period.getDays())
                    .remainingDaysAtApply(remainingDaysAfterApply)  // 신청 후 잔여 연차
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

            // 11. 캘린더 일정 자동 생성
            // 기타 휴가인 경우 사용자가 체크한 경우에만 캘린더 등록
            boolean shouldCreateCalendarEvent = true;
            if ("기타".equals(period.getVacationType())) {
                shouldCreateCalendarEvent = saveDTO.getEtcAddToCalendar() != null && saveDTO.getEtcAddToCalendar();
                log.info("[기타 휴가] 캘린더 등록 여부: {}", shouldCreateCalendarEvent);
            }

            if (shouldCreateCalendarEvent) {
                createCalendarEventForVacation(userIdx, user, savedDocument.getIdx(), period, saveDTO.getReason());
            } else {
                log.info("[캘린더 일정 생성 스킵] 기타 휴가이며 캘린더 등록 체크 안됨");
            }
        }

        // 12. PDF 파일 생성 및 저장
        try {
            log.info("[PDF 생성 시작] documentIdx: {}", savedDocument.getIdx());

            // 프론트엔드에서 렌더링된 HTML/CSS로 PDF 생성
            String renderedHtml = saveDTO.getRenderedHtml();
            String renderedCss = saveDTO.getRenderedCss();

            if (renderedHtml == null || renderedHtml.isEmpty()) {
                log.warn("[PDF 생성 스킵] 렌더링된 HTML이 없습니다. documentIdx: {}", savedDocument.getIdx());
                throw new IllegalArgumentException("렌더링된 HTML이 없습니다.");
            }

            // HTML 전체 문서 구성
            String fullHtml = "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "<head>\n" +
                    "    <meta charset=\"UTF-8\">\n" +
                    "    <style>\n" +
                    "        * { box-sizing: border-box; margin: 0; padding: 0; }\n" +
                    "        body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; margin: 1.5cm; background: white; }\n" +
                    (renderedCss != null ? renderedCss : "") +
                    "\n" +
                    "        /* PDF 전용 글자 크기 조정 */\n" +
                    "        .document-form * { font-size: 10px !important; }\n" +
                    "        .document-form th, .document-form td { font-size: 10px !important; padding: 8px 12px !important; }\n" +
                    "        .doc-title { font-size: 22px !important; }\n" +
                    "        .approval-header { font-size: 9px !important; width: 80px !important; padding: 5px 10px !important; }\n" +
                    "        .approval-sign-cell { width: 80px !important; height: 80px !important; padding: 3px !important; }\n" +
                    "        .approval-name-cell { font-size: 9px !important; padding: 6px 5px !important; }\n" +
                    "    </style>\n" +
                    "</head>\n" +
                    "<body>\n" +
                    renderedHtml +
                    "</body>\n" +
                    "</html>";

            // PDF 생성: Playwright로 HTML을 PDF로 변환
            byte[] pdfBytes = pdfGenerationService.generatePdfFromRenderedHtml(fullHtml);

            // 파일명 생성
            String firstStartDate = saveDTO.getPeriods().get(0).getStartDate().toString().replace("-", "");
            String year = saveDTO.getPeriods().get(0).getStartDate().toString().substring(0, 4);
            String userIdentifier = user.getEmpId() != null && !user.getEmpId().isEmpty() ? user.getEmpId() : String.valueOf(userIdx);
            String fileName = String.format("%s_vacation_request_%s.pdf", firstStartDate, userIdentifier);

            // PDF 서버에 저장
            String savePath = pdfGenerationService.saveVacationPdf(pdfBytes, fileName, year, userIdentifier);
            log.info("[PDF 저장 완료] path: {}", savePath);

            // DB에 파일 정보 저장
            VacationOfficialPdf officialPdf = VacationOfficialPdf.builder()
                    .documentIdx(savedDocument.getIdx())
                    .filePath(savePath)
                    .fileName(fileName)
                    .fileSize((long) pdfBytes.length)
                    .createdUserIdx(userIdx)
                    .build();

            vacationOfficialPdfRepository.save(officialPdf);
            log.info("[PDF 파일 정보 DB 저장 완료] fileIdx: {}, documentIdx: {}", officialPdf.getIdx(), savedDocument.getIdx());

        } catch (Exception e) {
            log.error("[PDF 생성 실패] documentIdx: {}, error: {}", savedDocument.getIdx(), e.getMessage(), e);
            // PDF 생성 실패는 전체 트랜잭션을 롤백하지 않음 (연차 신청은 유지)
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
            throw new RuntimeException("연차 신청서 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    /**
     * 연차 신청 시 캘린더 일정 자동 생성
     */
    private void createCalendarEventForVacation(Long userIdx, User user, Long documentIdx,
                                                VacationRequestSaveDTO.VacationPeriod period, String reason) {
        try {
            log.info("[캘린더 일정 생성 시작] userIdx: {}, documentIdx: {}, vacationType: {}, startDate: {}, endDate: {}",
                    userIdx, documentIdx, period.getVacationType(), period.getStartDate(), period.getEndDate());

            // 연차 유형에 따른 이벤트 제목 생성
            String eventTitle = getVacationTypeTitle(period.getVacationType(), user.getEmpName());
            log.info("[이벤트 제목 생성] eventTitle: {}", eventTitle);

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
                    .createdUserIdx(userIdx) // 생성자 설정 (중요!)
                    .updatedAt(LocalDateTime.now())
                    .updatedUserIdx(userIdx)
                    .build();

            log.info("[CalendarEvent 객체 생성 완료] 저장 시작...");
            CalendarEvent savedEvent = calendarEventRepository.save(calendarEvent);
            log.info("[캘린더 일정 저장 성공] eventIdx: {}, eventTitle: {}, startDate: {}, endDate: {}",
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

            log.info("[CalendarParticipant 객체 생성 완료] 저장 시작...");
            calendarParticipantRepository.save(participant);
            log.info("[캘린더 참석자 추가 성공] participantIdx: {}, userIdx: {}, userName: {}",
                    participant.getIdx(), userIdx, user.getEmpName());

            log.info("[캘린더 일정 생성 완료] ✓ eventIdx: {}, title: {}", savedEvent.getIdx(), eventTitle);

        } catch (Exception e) {
            log.error("========================================");
            log.error("[캘린더 일정 생성 실패] ❌❌❌");
            log.error("userIdx: {}", userIdx);
            log.error("documentIdx: {}", documentIdx);
            log.error("vacationType: {}", period.getVacationType());
            log.error("startDate: {}, endDate: {}", period.getStartDate(), period.getEndDate());
            log.error("Exception Type: {}", e.getClass().getName());
            log.error("Error Message: {}", e.getMessage());
            log.error("Stack Trace:", e);
            log.error("========================================");
            // 캘린더 일정 생성 실패해도 연차 신청은 진행되도록 예외를 삼킴
        }
    }

    /**
     * 연차 유형에 따른 이벤트 제목 생성
     */
    private String getVacationTypeTitle(String vacationType, String empName) {
        String typeLabel;
        switch (vacationType) {
            case "연차":
                typeLabel = "연차";
                break;
            case "반차(오전)":
                typeLabel = "오전 반차";
                break;
            case "반차(오후)":
                typeLabel = "오후 반차";
                break;
            case "기타":
                typeLabel = "연차";  // 기타는 "연차"로 표시
                break;
            default:
                // 경조사(본인결혼), 경조사(부모상) 등은 그냥 "경조사"로만 표시
                if (vacationType != null && vacationType.startsWith("경조사")) {
                    typeLabel = "경조사";
                } else {
                    log.warn("[알 수 없는 연차 유형] vacationType: {}, empName: {}", vacationType, empName);
                    typeLabel = "휴가";
                }
                break;
        }
        return empName + " " + typeLabel;
    }

    // ============================================
    // 보안 검증 메서드
    // ============================================

    /**
     * 휴가 일수 계산 (연차 유형에 따라 영업일 또는 전체 일수)
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

        // 경조사 처리 (배우자출산 제외 - 휴무일 포함)
        if (vacationType != null && vacationType.contains("경조사") && !vacationType.contains("배우자출산")) {
            // 경조사는 주말/공휴일 포함하여 전체 일수로 계산
            long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
            return new BigDecimal(totalDays);
        }

        // 배우자출산 또는 일반 연차: 영업일만 카운트 (주말/공휴일 제외)
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
     * 본인결혼 휴가 중복 신청 검증
     * - 결혼은 인생에 한 번만 가능하므로, 본인결혼 휴가도 한 번만 신청 가능
     */
    private void validateMarriageLeave(Long userIdx, List<VacationRequestSaveDTO.VacationPeriod> periods) {
        // 현재 신청 중인 기간에 "본인결혼"이 포함되어 있는지 확인
        boolean hasMarriageLeave = periods.stream()
                .anyMatch(period -> period.getVacationType() != null &&
                                   period.getVacationType().contains("본인결혼"));

        if (!hasMarriageLeave) {
            // 본인결혼 휴가가 포함되지 않았다면 검증 불필요
            return;
        }

        // 과거에 이미 본인결혼 휴가를 신청한 적이 있는지 확인
        boolean alreadyApplied = vacationRequestRepository.existsByUserIdxAndVacationTypeContaining(userIdx, "본인결혼");

        if (alreadyApplied) {
            throw new IllegalStateException(
                "본인결혼 휴가는 이미 신청하셨습니다. 결혼 휴가는 한 번만 신청 가능합니다."
            );
        }

        log.info("[본인결혼 휴가 검증 통과] userIdx: {}, 첫 신청", userIdx);
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

    @Override
    @Transactional(readOnly = true)
    public com.pinecni.erp.api.vacation.dto.VacationDetailDTO getVacationDetail(Long documentIdx) {
        log.info("[연차신청서 상세 조회 시작] documentIdx: {}", documentIdx);

        // 1. ApprovalDocument 조회
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("문서를 찾을 수 없습니다. documentIdx: " + documentIdx));

        // 2. VacationRequest 목록 조회 (document_idx로 조회)
        List<VacationRequest> vacationRequests = vacationRequestRepository.findByDocumentIdx(documentIdx);
        if (vacationRequests.isEmpty()) {
            throw new IllegalStateException("연차 신청 정보를 찾을 수 없습니다. documentIdx: " + documentIdx);
        }

        // 3. 기안자 정보 조회
        User drafter = userRepository.findById(document.getDrafterUserIdx())
                .orElseThrow(() -> new IllegalArgumentException("기안자 정보를 찾을 수 없습니다."));

        // 4. 부서명 조회
        String deptName = codeRepository.findByCode(drafter.getEmpDept())
                .map(Code::getCodeName)
                .orElse(drafter.getEmpDept());

        // 4-2. 직급명 조회
        String positionName = codeRepository.findByCode(drafter.getEmpPosition())
                .map(Code::getCodeName)
                .orElse(drafter.getEmpPosition());

        // 5. 잔여 연차 조회 (첫 번째 요청의 remainingDaysAtApply 사용)
        BigDecimal remainingDays = vacationRequests.getFirst().getRemainingDaysAtApply();

        // 6. 연차 기간 목록 생성
        List<com.pinecni.erp.api.vacation.dto.VacationDetailDTO.PeriodDTO> periods = vacationRequests.stream()
                .map(vr -> com.pinecni.erp.api.vacation.dto.VacationDetailDTO.PeriodDTO.builder()
                        .vacationType(vr.getVacationType())
                        .startDate(vr.getStartDate())
                        .endDate(vr.getEndDate())
                        .days(vr.getDays())
                        .build())
                .toList();

        // 7. 첨부파일 목록 조회
        List<VacationOfficialPdf> files = vacationOfficialPdfRepository.findAllByDocumentIdx(documentIdx);
        List<com.pinecni.erp.api.vacation.dto.VacationDetailDTO.AttachmentDTO> attachments = files.stream()
                .map(file -> com.pinecni.erp.api.vacation.dto.VacationDetailDTO.AttachmentDTO.builder()
                        .idx(file.getIdx())
                        .originalFileName(file.getFileName())
                        .fileSize(file.getFileSize())
                        .build())
                .toList();

        // 8. 결재라인 정보 생성
        List<com.pinecni.erp.api.vacation.dto.VacationDetailDTO.ApproverDTO> approvers = new ArrayList<>();

        // 8-1. 담당 (기안자 본인)
        approvers.add(com.pinecni.erp.api.vacation.dto.VacationDetailDTO.ApproverDTO.builder()
                .userIdx(drafter.getIdx())
                .name(drafter.getEmpName())
                .position(positionName)
                .status("APPROVED")  // 담당은 신청과 동시에 승인
                .approvedAt(vacationRequests.getFirst().getCreatedAt().toString())
                .build());

        // 8-2. 부서장 (기안자의 상사)
        if (drafter.getManagerIdx() != null) {
            User manager = userRepository.findById(drafter.getManagerIdx()).orElse(null);
            if (manager != null) {
                String managerPositionName = codeRepository.findByCode(manager.getEmpPosition())
                        .map(Code::getCodeName)
                        .orElse(manager.getEmpPosition());

                approvers.add(com.pinecni.erp.api.vacation.dto.VacationDetailDTO.ApproverDTO.builder()
                        .userIdx(manager.getIdx())
                        .name(manager.getEmpName())
                        .position(managerPositionName)
                        .status("PENDING")  // 대기 중
                        .approvedAt(null)
                        .build());

                // 8-3. 대표이사 (부서장의 상사 또는 isAdmin=true인 최상위 관리자)
                User ceo = null;
                if (manager.getManagerIdx() != null) {
                    ceo = userRepository.findById(manager.getManagerIdx()).orElse(null);
                }
                // 부서장의 상사가 없으면 isAdmin=true인 사용자 찾기
                if (ceo == null) {
                    ceo = userRepository.findAll().stream()
                            .filter(u -> Boolean.TRUE.equals(u.getIsAdmin()))
                            .findFirst()
                            .orElse(null);
                }

                if (ceo != null) {
                    String ceoPositionName = codeRepository.findByCode(ceo.getEmpPosition())
                            .map(Code::getCodeName)
                            .orElse(ceo.getEmpPosition());

                    approvers.add(com.pinecni.erp.api.vacation.dto.VacationDetailDTO.ApproverDTO.builder()
                            .userIdx(ceo.getIdx())
                            .name(ceo.getEmpName())
                            .position(ceoPositionName)
                            .status("PENDING")  // 대기 중
                            .approvedAt(null)
                            .build());
                }
            }
        }

        // 9. 사유 (첫 번째 요청의 reason 사용)
        String reason = vacationRequests.getFirst().getReason();

        // 10. DTO 생성
        com.pinecni.erp.api.vacation.dto.VacationDetailDTO detailDTO = com.pinecni.erp.api.vacation.dto.VacationDetailDTO.builder()
                .documentIdx(documentIdx)
                .documentNo(document.getDocumentNo())
                .applyDate(vacationRequests.getFirst().getApplyDate())
                .drafterUserIdx(document.getDrafterUserIdx())  // 작성자 사용자 idx 추가
                .drafterName(drafter.getEmpName())
                .drafterDept(deptName)
                .drafterPosition(positionName)
                .remainingDays(remainingDays)
                .reason(reason)
                .status("PENDING")  // TODO: ApprovalDocument에 status 필드 추가 후 실제 상태 반환
                .periods(periods)
                .approvers(approvers)
                .attachments(attachments)
                .build();

        log.info("[연차신청서 상세 조회 완료] documentIdx: {}, 기간 수: {}, 첨부파일 수: {}",
                documentIdx, periods.size(), attachments.size());

        return detailDTO;
    }

    @Override
    @Transactional
    public void approveVacation(Long documentIdx, Long approverUserIdx) {
        log.info("[연차신청서 승인 시작] documentIdx: {}, approverUserIdx: {}", documentIdx, approverUserIdx);

        // TODO: 결재 워크플로우 구현 필요
        // 1. ApprovalLine에서 현재 결재자가 대기 중인 결재건인지 확인
        // 2. 결재 상태를 APPROVED로 변경
        // 3. 다음 결재자가 있으면 다음 결재자에게 알림
        // 4. 마지막 결재자라면 ApprovalDocument의 status를 APPROVED로 변경
        // 5. 연차 잔액 차감 (VacationBalance 업데이트)
        // 6. 캘린더에 연차 일정 등록 (CalendarEvent 생성)

        throw new UnsupportedOperationException("결재 워크플로우가 아직 구현되지 않았습니다.");
    }

    @Override
    @Transactional
    public void rejectVacation(Long documentIdx, Long approverUserIdx, String reason) {
        log.info("[연차신청서 반려 시작] documentIdx: {}, approverUserIdx: {}, reason: {}",
                documentIdx, approverUserIdx, reason);

        // TODO: 결재 워크플로우 구현 필요
        // 1. ApprovalLine에서 현재 결재자가 대기 중인 결재건인지 확인
        // 2. 결재 상태를 REJECTED로 변경, 반려 사유 저장
        // 3. ApprovalDocument의 status를 REJECTED로 변경
        // 4. 기안자에게 반려 알림

        throw new UnsupportedOperationException("결재 워크플로우가 아직 구현되지 않았습니다.");
    }

    @Override
    @Transactional
    public void deleteVacation(Long documentIdx, Long currentUserIdx) {
        log.info("[연차신청서 삭제 시작] documentIdx: {}, currentUserIdx: {}", documentIdx, currentUserIdx);

        // 1. ApprovalDocument 조회
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("문서를 찾을 수 없습니다. documentIdx: " + documentIdx));

        // 2. Soft delete 확인
        if (document.getDeletedAt() != null) {
            throw new IllegalStateException("이미 삭제된 문서입니다.");
        }

        // 3. ApprovalDocument soft delete
        document.setDeletedAt(LocalDateTime.now());
        document.setDeletedUserIdx(currentUserIdx);
        approvalDocumentRepository.save(document);

        // 4. VacationRequest 조회 및 캘린더 일정 삭제
        List<VacationRequest> vacationRequests = vacationRequestRepository.findByDocumentIdx(documentIdx);

        // 5. 삭제할 총 연차 일수 계산 (경조사와 기타는 연차 차감 대상이 아니므로 제외)
        BigDecimal totalDaysToRestore = vacationRequests.stream()
                .filter(vr -> !vr.getVacationType().contains("경조사") && !"기타".equals(vr.getVacationType()))
                .map(VacationRequest::getDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        log.info("[연차 일수 복구 계산] 총 복구할 일수: {}일 (경조사, 기타 제외)", totalDaysToRestore);

        // 6. VacationBalance 업데이트 (연차 잔액 복구)
        if (totalDaysToRestore.compareTo(BigDecimal.ZERO) > 0 && !vacationRequests.isEmpty()) {
            Long userIdx = vacationRequests.getFirst().getUserIdx();
            int currentYear = LocalDate.now().getYear();

            VacationBalance vacationBalance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, currentYear)
                    .orElseThrow(() -> new IllegalStateException("연차 잔액 정보를 찾을 수 없습니다. userIdx: " + userIdx));

            // 사용 연차 감소, 잔여 연차 증가
            BigDecimal currentUsedDays = vacationBalance.getUsedDays();
            BigDecimal currentRemainingDays = vacationBalance.getRemainingDays();

            vacationBalance.setUsedDays(currentUsedDays.subtract(totalDaysToRestore));
            vacationBalance.setRemainingDays(currentRemainingDays.add(totalDaysToRestore));
            vacationBalance.setUpdatedUserIdx(currentUserIdx);

            vacationBalanceRepository.save(vacationBalance);

            log.info("[연차 잔액 복구] userIdx: {}, 복구 일수: {}일, 사용: {} → {}일, 잔여: {} → {}일",
                    userIdx, totalDaysToRestore,
                    currentUsedDays, vacationBalance.getUsedDays(),
                    currentRemainingDays, vacationBalance.getRemainingDays());
        }

        // 7. 캘린더 일정 삭제
        for (VacationRequest vr : vacationRequests) {
            // 기간에 해당하는 캘린더 일정 조회 및 완전 삭제
            List<CalendarEvent> events = calendarEventRepository.findByUserIdxAndDateRange(
                    vr.getUserIdx(), vr.getStartDate(), vr.getEndDate()
            );

            for (CalendarEvent event : events) {
                // 연차 관련 일정인지 확인 (eventTitle에 "연차" 또는 특정 키워드 포함)
                if (event.getEventTitle() != null &&
                    (event.getEventTitle().contains("연차") || event.getEventTitle().contains("휴가"))) {
                    // 완전 삭제 (hard delete)
                    calendarEventRepository.delete(event);
                    log.info("[캘린더 일정 삭제] eventIdx: {}, eventTitle: {}", event.getIdx(), event.getEventTitle());
                }
            }
        }

        log.info("[연차신청서 삭제 완료] documentIdx: {}, 연차 기간 수: {}, 복구 일수: {}일",
                documentIdx, vacationRequests.size(), totalDaysToRestore);
    }
}
