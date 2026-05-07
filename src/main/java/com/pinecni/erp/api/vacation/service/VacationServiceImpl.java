package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.api.calendar.repository.CalendarEventRepository;
import com.pinecni.erp.api.calendar.repository.CalendarParticipantRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.dto.VacationCalculationDetailDTO;
import com.pinecni.erp.api.vacation.dto.VacationRequestSaveDTO;
import com.pinecni.erp.api.vacation.dto.MonthlyLeaveExpiryDTO;
import com.pinecni.erp.api.vacation.repository.LeaveTypeSummaryProjection;
import com.pinecni.erp.api.vacation.repository.VacationAccrualScheduleRepository;
import com.pinecni.erp.api.vacation.repository.VacationBalanceRepository;
import com.pinecni.erp.api.vacation.repository.VacationRequestRepository;
import com.pinecni.erp.api.vacation.repository.VacationOfficialPdfRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VacationServiceImpl implements VacationService {

    private final UserRepository userRepository;
    private final VacationAccrualScheduleRepository accrualScheduleRepository;
    private final VacationBalanceRepository balanceRepository;
    private final VacationRequestRepository vacationRequestRepository;
    private final VacationOfficialPdfRepository vacationOfficialPdfRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final CodeRepository codeRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final CalendarParticipantRepository calendarParticipantRepository;
    private final com.pinecni.erp.api.calendar.service.HolidayService holidayService;
    private final com.pinecni.erp.api.user.service.UserService userService;
    private final com.pinecni.erp.api.signature.service.SignatureService signatureService;
    private final com.pinecni.erp.api.notification.service.NotificationEnqueueService notificationEnqueueService;

    /**
     * self-proxy: 배치 메서드에서 각 사용자를 독립 트랜잭션으로 실행하기 위해 사용.
     * @Lazy 로 순환 의존성 방지.
     */
    @Autowired
    @Lazy
    private VacationService self;

    @Override
    @Transactional
    public VacationUserInfoDTO getUserVacationInfo(Long userIdx, Integer year) {
        log.info("[사용자 연차 정보 조회] userIdx: {}, year: {}", userIdx, year);
        // 1. 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));

        // 2. 입사 전 연도 조회 차단 — 입사일이 있고 조회 연도 < 입사 연도이면 연차 없음 DTO 조기 반환
        LocalDate joinDate = user.getEmpJoinDate();
        if (joinDate != null && year < joinDate.getYear()) {
            log.info("[입사 전 연도 조회] userIdx={}, empName={}, joinYear={}, requestedYear={}",
                    userIdx, user.getEmpName(), joinDate.getYear(), year);
            String preDeptName = codeRepository.findByGroupCodeAndCode(
                            CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                    .map(Code::getCodeName).orElse(user.getEmpDept());
            String prePosName = codeRepository.findByGroupCodeAndCode(
                            CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                    .map(Code::getCodeName).orElse(user.getEmpPosition());
            return VacationUserInfoDTO.builder()
                    .userIdx(user.getIdx())
                    .empName(user.getEmpName())
                    .empDept(user.getEmpDept())
                    .empDeptName(preDeptName)
                    .empPosition(user.getEmpPosition())
                    .empPositionName(prePosName)
                    .empJoinDate(joinDate.format(DateTimeFormatter.ISO_DATE))
                    .year(year)
                    .preEmployment(true)
                    .totalDays(BigDecimal.ZERO)
                    .usedDays(BigDecimal.ZERO)
                    .remainingDays(BigDecimal.ZERO)
                    .build();
        }

        // 3. vacation_balance 조회
        // balance가 없거나, accrual_schedule 자체가 없으면(=0값으로 저장된 stale 데이터 포함) 재계산
        Optional<VacationBalance> balanceOpt = balanceRepository.findByUserIdxAndYear(userIdx, year);
        boolean needsCompute = balanceOpt.isEmpty()
                || !accrualScheduleRepository.existsByUserIdxAndYear(userIdx, year);
        if (needsCompute) {
            log.info("[vacation_balance 재계산] userIdx={}, year={}, reason={}", userIdx, year,
                    balanceOpt.isEmpty() ? "balance 없음" : "accrual_schedule 없음(stale 0값 의심)");
            computeAndSaveVacationBalance(userIdx, year);
            balanceOpt = balanceRepository.findByUserIdxAndYear(userIdx, year);
        }
        VacationBalance balance = balanceOpt
                .orElseThrow(() -> new IllegalStateException(
                        "vacation_balance 생성 후 조회 실패: userIdx=" + userIdx + ", year=" + year));

        // 3. 부서명 / 직급명 조회
        String empDeptName = codeRepository.findByGroupCodeAndCode(
                        CodeConstants.GroupCode.DEPARTMENT.getCode(), user.getEmpDept())
                .map(Code::getCodeName)
                .orElse(user.getEmpDept());

        String empPositionName = codeRepository.findByGroupCodeAndCode(
                        CodeConstants.GroupCode.POSITION.getCode(), user.getEmpPosition())
                .map(Code::getCodeName)
                .orElse(user.getEmpPosition());

        // 4. DTO 생성 (vacation_balance 기반)
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
                .empJoinDate(user.getEmpJoinDate() != null ? user.getEmpJoinDate().format(DateTimeFormatter.ISO_DATE) : null)
                .year(year)
                // 집계값 (vacation_balance)
                .totalDays(balance.getGrantedDays())
                .usedDays(balance.getUsedDays())
                .remainingDays(balance.getRemainingDays())
                // 상세 breakdown
                .annualLeaveDays(balance.getAnnualLeaveDays())
                .monthlyLeaveDays(balance.getMonthlyLeaveDays())
                .proportionalDays(balance.getProportionalDays())
                .compensatoryDays(balance.getCompensatoryDays())
                .expiredMonthlyDays(balance.getExpiredMonthlyDays())
                .earlyUseDays(balance.getEarlyUseDays())
                // 다음 발생 예정
                .nextAccrualDate(balance.getNextAccrualDate() != null
                        ? balance.getNextAccrualDate().format(DateTimeFormatter.ISO_DATE) : null)
                .nextAccrualDays(balance.getNextAccrualDays())
                .nextAccrualType(balance.getNextAccrualType())
                .nextAccrualDesc(balance.getNextAccrualDesc())
                .build();

        // 월차 만료일별 FIFO 잔여 계산
        LocalDate infoEffectiveDate = (year == LocalDate.now().getYear())
                ? LocalDate.now() : LocalDate.of(year, 12, 31);
        dto.setMonthlyExpiryBreakdown(
                computeMonthlyExpiryBreakdown(userIdx, year, infoEffectiveDate, balance.getUsedDays()));

        log.info("[사용자 연차 정보 조회 완료] empName={}, granted={}, expiredMonthly={}, used={}, remaining={}",
                dto.getEmpName(), dto.getTotalDays(), dto.getExpiredMonthlyDays(), dto.getUsedDays(), dto.getRemainingDays());

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

        // 공통 만료일: 기본연차/근속가산/비례연차/보상휴가 = 해당 연도 12/31
        LocalDate yearEndExpiry = yearEnd;
        // 월차 만료일: 1주년 전날 (마지막 월차 제외)
        LocalDate monthlyExpiry = oneYearAnniversary.minusDays(1);
        // 마지막 월차 만료일: 1주년 월 말일
        LocalDate lastMonthlyExpiry = YearMonth.from(oneYearAnniversary).atEndOfMonth();

        // === Case 1: 1년 이상 근속자 ===
        if (yearsOfServiceAtYearStart >= 1) {
            // 1월 1일: 기본 15일 발생
            schedules.add(createAccrual(userIdx, year, yearStart,
                    VacationAccrualSchedule.TYPE_BASE, new BigDecimal("15.0"),
                    "기본 연차 15일", yearEndExpiry, operatorUserIdx));

            // ── 누적 근속가산: 연초(1/1) 기준으로 이미 발생한 가산일 합산 → 1/1에 1개 항목으로 추가
            // (연초 당일 기념일 포함: isBefore || equals yearStart)
            int accumulated = 0;
            for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (!seniorityDate.isAfter(yearStart)) {
                    accumulated++;
                    if (accumulated >= 10) { accumulated = 10; break; }
                }
            }
            if (accumulated > 0) {
                schedules.add(createAccrual(userIdx, year, yearStart,
                        VacationAccrualSchedule.TYPE_SENIORITY, new BigDecimal(accumulated),
                        "누적 근속가산 +" + accumulated + "일", yearEndExpiry, operatorUserIdx));
            }

            // ── 이번 연도 신규 근속가산: 연초 이후 기념일이 올해인 경우 해당 날짜에 +1일
            for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.isAfter(yearStart) && seniorityDate.getYear() == year) {
                    schedules.add(createAccrual(userIdx, year, seniorityDate,
                            VacationAccrualSchedule.TYPE_SENIORITY, new BigDecimal("1.0"),
                            "만 " + seniorityYear + "년 근속 가산 (+1일)", yearEndExpiry, operatorUserIdx));
                }
            }

            // 만 10년 보상휴가: 5일 (1회한)
            LocalDate tenYearDate = joinDate.plusYears(10);
            if (tenYearDate.getYear() == year) {
                schedules.add(createAccrual(userIdx, year, tenYearDate,
                        VacationAccrualSchedule.TYPE_COMPENSATORY, new BigDecimal("5.0"),
                        "만 10년 근속 보상 휴가 (+5일)", yearEndExpiry, operatorUserIdx));
            }
        }
        // === Case 2: 1년 초과하는 해 ===
        else if (oneYearAnniversary.getYear() == year) {
            // 월차: 1월 ~ 1주년 전월까지 (마지막 월차는 다른 expiry_date 적용)
            int monthlyEndMonth = oneYearAnniversary.getMonthValue() - 1;
            for (int month = 1; month <= monthlyEndMonth; month++) {
                LocalDate monthlyDate = LocalDate.of(year, month, joinDate.getDayOfMonth() + 1);
                // 날짜 유효성 검사 (예: 2월 30일 -> 2월 말일)
                if (monthlyDate.getMonthValue() != month) {
                    monthlyDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
                }

                boolean isLast = (month == monthlyEndMonth);
                LocalDate expiryDate = isLast ? lastMonthlyExpiry : monthlyExpiry;

                schedules.add(createAccrual(userIdx, year, monthlyDate,
                        VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                        month + "월 만근 월차", expiryDate, operatorUserIdx));
            }

            // 비례 연차: 1주년일에 발생
            long daysInYear = yearEnd.isLeapYear() ? 366 : 365;
            long remainingDays = ChronoUnit.DAYS.between(oneYearAnniversary, yearEnd) + 1;
            BigDecimal proportionalDays = new BigDecimal(remainingDays)
                    .divide(new BigDecimal(daysInYear), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("15"))
                    .setScale(0, RoundingMode.HALF_UP);

            schedules.add(createAccrual(userIdx, year, oneYearAnniversary,
                    VacationAccrualSchedule.TYPE_PROPORTIONAL, proportionalDays,
                    "비례 연차 (1년일~12/31)", yearEndExpiry, operatorUserIdx));
        }
        // === Case 3: 1년 미만 ===
        else {
            int joinMonth = joinDate.getMonthValue();
            int joinDay = joinDate.getDayOfMonth();

            // 입사 연도인 경우: 입사월+1 ~ 12월
            // 1월 입사자는 Case 2 루프(monthlyEndMonth=0)가 실행되지 않으므로
            // 12월 만근 월차가 전체 마지막 월차 → lastMonthlyExpiry 적용
            if (joinDate.getYear() == year) {
                for (int month = joinMonth + 1; month <= 12; month++) {
                    LocalDate monthlyDate = LocalDate.of(year, month, joinDay + 1);
                    // 날짜 유효성 검사
                    if (monthlyDate.getMonthValue() != month) {
                        monthlyDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
                    }

                    boolean isLast = (month == 12) && (oneYearAnniversary.getMonthValue() == 1);
                    schedules.add(createAccrual(userIdx, year, monthlyDate,
                            VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                            month + "월 만근 월차", isLast ? lastMonthlyExpiry : monthlyExpiry, operatorUserIdx));
                }
            }
            // 입사 다음 해이지만 1년 미만: 1월 ~ 12월 (모두 마지막 아님)
            else if (oneYearAnniversary.getYear() > year) {
                for (int month = 1; month <= 12; month++) {
                    LocalDate monthlyDate = LocalDate.of(year, month, joinDay + 1);
                    // 날짜 유효성 검사
                    if (monthlyDate.getMonthValue() != month) {
                        monthlyDate = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
                    }

                    schedules.add(createAccrual(userIdx, year, monthlyDate,
                            VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                            month + "월 만근 월차", monthlyExpiry, operatorUserIdx));
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
    public int generateAllVacationAccrualSchedules(Integer year) {
        return generateAllVacationAccrualSchedules(year, userRepository.findAllActive());
    }

    @Override
    // @Transactional 없음 — self 프록시를 통해 사용자별 독립 트랜잭션으로 실행
    public int generateAllVacationAccrualSchedules(Integer year, List<User> activeUsers) {
        log.info("[전체 연차 발생 일정 생성] year: {}", year);

        int count = 0;

        for (User user : activeUsers) {
            try {
                // self 프록시 호출 → 사용자마다 독립 트랜잭션 (한 명 실패해도 다음 사람에 영향 없음)
                self.generateVacationAccrualSchedule(user.getIdx(), year, 1L);
                count++;
            } catch (Exception e) {
                log.error("[연차 발생 일정 생성 실패] userIdx: {}, error: {}", user.getIdx(), e.getMessage());
            }
        }

        log.info("[전체 연차 발생 일정 생성 완료] year: {}, 처리: {}명", year, count);
        return count;
    }

    @Override
    // @Transactional 없음 — self 프록시를 통해 사용자별 독립 트랜잭션으로 실행
    public int processDailyAccruals(LocalDate targetDate) {
        log.info("[일일 연차 발생 처리] date: {}", targetDate);

        int count = 0;
        List<User> activeUsers = userRepository.findAllActive();

        for (User user : activeUsers) {
            if (user.getEmpJoinDate() == null) continue;
            try {
                count += self.processDailyAccrualsForUser(user.getIdx(), targetDate);
            } catch (Exception e) {
                log.error("[일일 연차 발생 처리 실패] userIdx: {}, error: {}", user.getIdx(), e.getMessage());
            }
        }

        log.info("[일일 연차 발생 처리 완료] date: {}, 발생 건수: {}", targetDate, count);
        return count;
    }

    @Override
    @Transactional
    public int processDailyAccrualsForUser(Long userIdx, LocalDate targetDate) {
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));

        LocalDate joinDate = user.getEmpJoinDate();
        if (joinDate == null) return 0;

        int year = targetDate.getYear();
        int joinDay = joinDate.getDayOfMonth();
        LocalDate oneYearAnniversary = joinDate.plusYears(1);
        long yearsOfServiceAtYearStart = ChronoUnit.YEARS.between(joinDate, LocalDate.of(year, 1, 1));

        List<VacationAccrualSchedule> todayAccruals = new ArrayList<>();

        LocalDate yearEnd = LocalDate.of(year, 12, 31);
        LocalDate monthlyExpiry     = oneYearAnniversary.minusDays(1);
        LocalDate lastMonthlyExpiry = YearMonth.from(oneYearAnniversary).atEndOfMonth();

        // 1. 기본 연차 발생 (1월 1일, 1년 이상 근속자)
        if (targetDate.getMonthValue() == 1 && targetDate.getDayOfMonth() == 1 && yearsOfServiceAtYearStart >= 1) {
            if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                    userIdx, year, targetDate, VacationAccrualSchedule.TYPE_BASE)) {
                todayAccruals.add(createAccrual(userIdx, year, targetDate,
                        VacationAccrualSchedule.TYPE_BASE, new BigDecimal("15.0"),
                        "기본 연차 15일", yearEnd, 1L));
            }
        }

        // 2. 근속가산 발생 (만 3년부터 매 2년마다 +1일)
        for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
            LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
            if (seniorityDate.equals(targetDate)) {
                if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                        userIdx, year, targetDate, VacationAccrualSchedule.TYPE_SENIORITY)) {
                    todayAccruals.add(createAccrual(userIdx, year, targetDate,
                            VacationAccrualSchedule.TYPE_SENIORITY, new BigDecimal("1.0"),
                            "만 " + seniorityYear + "년 근속 가산 (+1일)", yearEnd, 1L));
                }
            }
        }

        // 2-1. 보상휴가 발생 (만 10년 주년일, 5일, 1회한)
        LocalDate tenYearDate = joinDate.plusYears(10);
        if (tenYearDate.equals(targetDate)) {
            if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                    userIdx, year, targetDate, VacationAccrualSchedule.TYPE_COMPENSATORY)) {
                todayAccruals.add(createAccrual(userIdx, year, targetDate,
                        VacationAccrualSchedule.TYPE_COMPENSATORY, new BigDecimal("5.0"),
                        "만 10년 근속 보상 휴가 (+5일)", yearEnd, 1L));
            }
        }

        // 3. 월차 발생 (매월 입사일+1, 간소화: 만근 가정)
        if (targetDate.getDayOfMonth() == joinDay + 1) {
            boolean shouldAccrue = false;
            boolean isLastMonthly = false;

            // Case 2: 1년 초과하는 해
            if (oneYearAnniversary.getYear() == year) {
                int monthlyEndMonth = oneYearAnniversary.getMonthValue() - 1;
                if (targetDate.getMonthValue() <= monthlyEndMonth) {
                    shouldAccrue = true;
                    isLastMonthly = (targetDate.getMonthValue() == monthlyEndMonth);
                }
            }
            // Case 3: 1년 미만
            else if (yearsOfServiceAtYearStart < 1) {
                if (joinDate.getYear() == year && targetDate.getMonthValue() > joinDate.getMonthValue()) {
                    shouldAccrue = true;
                    // 1월 입사자는 Case 2 루프가 실행되지 않으므로
                    // 12월 만근 월차가 전체 마지막 월차 → lastMonthlyExpiry 적용
                    isLastMonthly = (targetDate.getMonthValue() == 12) && (oneYearAnniversary.getMonthValue() == 1);
                } else if (oneYearAnniversary.getYear() > year && joinDate.getYear() < year) {
                    shouldAccrue = true;
                }
            }

            if (shouldAccrue && !accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                    userIdx, year, targetDate, VacationAccrualSchedule.TYPE_MONTHLY)) {
                LocalDate expiryDate = isLastMonthly ? lastMonthlyExpiry : monthlyExpiry;
                todayAccruals.add(createAccrual(userIdx, year, targetDate,
                        VacationAccrualSchedule.TYPE_MONTHLY, new BigDecimal("1.0"),
                        targetDate.getMonthValue() + "월 만근 월차", expiryDate, 1L));
            }
        }

        // 4. 비례 연차 발생 (1년일)
        if (oneYearAnniversary.equals(targetDate)) {
            long daysInYear = yearEnd.isLeapYear() ? 366 : 365;
            long remainingDays = ChronoUnit.DAYS.between(oneYearAnniversary, yearEnd) + 1;
            BigDecimal proportionalDays = new BigDecimal(remainingDays)
                    .divide(new BigDecimal(daysInYear), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("15"))
                    .setScale(0, RoundingMode.HALF_UP);

            if (!accrualScheduleRepository.existsByUserIdxAndYearAndAccrualDateAndAccrualType(
                    userIdx, year, targetDate, VacationAccrualSchedule.TYPE_PROPORTIONAL)) {
                todayAccruals.add(createAccrual(userIdx, year, targetDate,
                        VacationAccrualSchedule.TYPE_PROPORTIONAL, proportionalDays,
                        "비례 연차 (1년일~12/31)", yearEnd, 1L));
            }
        }

        if (!todayAccruals.isEmpty()) {
            accrualScheduleRepository.saveAll(todayAccruals);
        }
        return todayAccruals.size();
    }

    @Override
    @Transactional
    public void computeAndSaveVacationBalance(Long userIdx, Integer year) {
        log.info("[vacation_balance 계산/저장] userIdx: {}, year: {}", userIdx, year);

        // ── 과거 연도 포함, accrual_schedule 없으면 먼저 생성 ───────────────────
        if (!accrualScheduleRepository.existsByUserIdxAndYear(userIdx, year)) {
            log.info("[vacation_accrual_schedule 없음 → 즉시 생성] userIdx={}, year={}", userIdx, year);
            generateVacationAccrualSchedule(userIdx, year, null);
        }

        // ── 기준일: 현재 연도만 오늘, 과거·미래 연도는 연말(12/31) ─────────────────
        // 과거: 해당 연도 전체 실적 집계
        // 현재: 오늘까지 발생분만 집계
        // 미래: 해당 연도 예상 전체 집계 (사용자가 미래 연차 계획 확인 등)
        int nowYear = LocalDate.now().getYear();
        LocalDate effectiveDate = (year == nowYear)
                ? LocalDate.now()
                : LocalDate.of(year, 12, 31);

        // ── 과거 연도: 스케줄러가 미실행된 상태이므로 만료 월차를 즉시 처리 ────────
        if (year < nowYear) {
            accrualScheduleRepository.markExpiredMonthlyForUser(userIdx, year, effectiveDate);
        }

        // 1. 각 타입별 발생 일수 통합 집계 (단일 쿼리, effectiveDate까지 발생분)
        LeaveTypeSummaryProjection summary = accrualScheduleRepository.sumAllLeaveTypes(userIdx, year, effectiveDate);
        BigDecimal annualLeaveDays    = summary.getAnnualLeaveDays();
        BigDecimal proportionalDays   = summary.getProportionalDays();
        BigDecimal compensatoryDays   = summary.getCompensatoryDays();
        BigDecimal validMonthlyDays   = summary.getValidMonthlyDays();

        // 소멸 월차 배치 목록 (만료일 오름차순)
        List<VacationAccrualSchedule> expiredBatches = accrualScheduleRepository.findExpiredMonthlyBatches(userIdx, year, effectiveDate);
        BigDecimal expiredMonthlyDays = expiredBatches.stream()
                .map(VacationAccrualSchedule::getDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        // 발행된 월차 전체 = 유효 + 소멸 (이월월차는 validMonthlyDays에 포함)
        BigDecimal allMonthlyIssuedDays = validMonthlyDays.add(expiredMonthlyDays);

        // 2. 연차 사용 내역 조회 (한 번만 조회하여 usedDays 계산 + FIFO 계산에 공유)
        List<VacationRequest> yearRequests = vacationRequestRepository.findByUserIdxAndYear(userIdx, year);
        BigDecimal usedDays = calculateUsedDaysFromList(yearRequests);

        // 3. 만료일 기준 FIFO: 각 배치의 만료일 이전에 실제로 사용한 일수를 배치별로 배분하여
        //    진짜 낭비된(사용 없이 만료된) 월차만 차감. (인메모리 계산, DB 추가 조회 없음)
        BigDecimal expiredUnusedMonthlyDays = calculateExpiredUnusedByFifo(yearRequests, expiredBatches);

        // 4. 부여일수 합계 (발행 전체: 유효 + 소멸)
        BigDecimal grantedDays = annualLeaveDays.add(allMonthlyIssuedDays)
                                                .add(proportionalDays)
                                                .add(compensatoryDays);

        // 5. 유효 부여 = 부여 - 미사용소멸월차, 잔여 = 유효부여 - 사용
        BigDecimal effectiveGranted = grantedDays.subtract(expiredUnusedMonthlyDays);
        BigDecimal remainingDays    = effectiveGranted.subtract(usedDays);

        // 6. 조기사용연차 = MAX(0, 사용 - 유효부여)
        BigDecimal earlyUseDays = usedDays.subtract(effectiveGranted).max(BigDecimal.ZERO);

        // 7. 다음 연도로 이월된 월차 (신년도에 이월월차 레코드가 있으면 차감)
        // → 잔여에서 이월분을 빼서 "이미 이월됐으므로 현재 연도에서는 사용 불가"를 반영
        BigDecimal carriedOutDays = accrualScheduleRepository
                .sumCarriedOutDays(userIdx, year + 1)
                .max(BigDecimal.ZERO);
        remainingDays = remainingDays.subtract(carriedOutDays);

        // 8. 다음 발생 예정 조회 (현재·미래 연도만 의미 있음; 과거 연도는 null 처리)
        LocalDate  nextAccrualDate = null;
        BigDecimal nextAccrualDays = null;
        String     nextAccrualType = null;
        String     nextAccrualDesc = null;

        if (year >= nowYear) {
            List<VacationAccrualSchedule> upcoming = accrualScheduleRepository.findUpcomingAccruals(
                    userIdx, LocalDate.now(), PageRequest.of(0, 1));
            if (!upcoming.isEmpty()) {
                VacationAccrualSchedule next = upcoming.get(0);
                nextAccrualDate = next.getAccrualDate();
                nextAccrualDays = next.getDays();
                nextAccrualType = next.getAccrualType();
                nextAccrualDesc = next.getDescription();
            }
        }

        // 9. UPSERT: 기존 행이 있으면 갱신, 없으면 신규 생성
        VacationBalance balance = balanceRepository.findByUserIdxAndYear(userIdx, year)
                .orElse(VacationBalance.builder().userIdx(userIdx).year(year).build());

        balance.setGrantedDays(grantedDays);
        balance.setAnnualLeaveDays(annualLeaveDays);
        balance.setMonthlyLeaveDays(allMonthlyIssuedDays);   // 발행 전체(유효+소멸), 화면 breakdown 합산용
        balance.setProportionalDays(proportionalDays);
        balance.setCompensatoryDays(compensatoryDays);
        balance.setExpiredMonthlyDays(expiredUnusedMonthlyDays); // 미사용 소멸분만 저장 (화면 "소멸월차" 표시)
        balance.setUsedDays(usedDays);
        balance.setEarlyUseDays(earlyUseDays);
        balance.setCarriedOverDays(carriedOutDays);
        balance.setRemainingDays(remainingDays);
        balance.setNextAccrualDate(nextAccrualDate);
        balance.setNextAccrualDays(nextAccrualDays);
        balance.setNextAccrualType(nextAccrualType);
        balance.setNextAccrualDesc(nextAccrualDesc);

        balanceRepository.save(balance);

        log.info("[vacation_balance 갱신 완료] userIdx={}, year={}, granted={}, carriedOut={}, used={}, remaining={}",
                userIdx, year, grantedDays, carriedOutDays, usedDays, remainingDays);
    }

    @Override
    public int computeAndSaveAllVacationBalances(Integer year) {
        return computeAndSaveAllVacationBalances(year, userRepository.findAllActive());
    }

    @Override
    // @Transactional 없음 — self 프록시를 통해 사용자별 독립 트랜잭션으로 실행
    public int computeAndSaveAllVacationBalances(Integer year, List<User> activeUsers) {
        log.info("[전체 vacation_balance 갱신] year: {}", year);

        int count = 0;

        for (User user : activeUsers) {
            try {
                self.computeAndSaveVacationBalance(user.getIdx(), year);
                count++;
            } catch (Exception e) {
                log.error("[vacation_balance 갱신 실패] userIdx={}, error={}", user.getIdx(), e.getMessage());
            }
        }

        log.info("[전체 vacation_balance 갱신 완료] year={}, 처리: {}명", year, count);
        return count;
    }

    @Override
    public int performAllCarryOvers(int fromYear) {
        return performAllCarryOvers(fromYear, userRepository.findAllActive());
    }

    @Override
    // @Transactional 없음 — self 프록시를 통해 사용자별 독립 트랜잭션으로 실행
    public int performAllCarryOvers(int fromYear, List<User> activeUsers) {
        log.info("[전체 월차 이월 처리] fromYear: {} → {}년", fromYear, fromYear + 1);

        int count = 0;

        for (User user : activeUsers) {
            if (user.getEmpJoinDate() == null) continue;
            try {
                self.performCarryOverForUser(user.getIdx(), fromYear);
                count++;
            } catch (Exception e) {
                log.error("[월차 이월 처리 실패] userIdx={}, error={}", user.getIdx(), e.getMessage());
            }
        }

        log.info("[전체 월차 이월 처리 완료] fromYear={}, 처리: {}명", fromYear, count);
        return count;
    }

    /**
     * 단일 사용자 월차 이월 처리
     *
     * - fromYear 의 만료되지 않은 유효 월차 잔여분을 toYear(=fromYear+1) 의 이월월차 레코드로 생성
     * - 이월 금액 = min(유효월차합계, 잔여일수).  잔여 = 0 이하면 스킵
     * - 멱등성: toYear 에 TYPE_CARRY_OVER 레코드가 이미 있으면 스킵
     * - 만료일: fromYear 유효 월차 중 가장 늦은 expiry_date 를 그대로 승계
     *
     * @param userIdx  사용자 IDX
     * @param fromYear 이월 출처 연도 (예: 2025)
     */
    @Override
    @Transactional
    public void performCarryOverForUser(Long userIdx, int fromYear) {
        int toYear = fromYear + 1;
        LocalDate toYearStart = LocalDate.of(toYear, 1, 1);

        // 1. 멱등성 체크: 이미 이월 레코드가 있으면 스킵
        if (accrualScheduleRepository.existsByUserIdxAndYearAndAccrualType(
                userIdx, toYear, VacationAccrualSchedule.TYPE_CARRY_OVER)) {
            log.debug("[월차 이월 스킵 - 이미 처리됨] userIdx={}, toYear={}", userIdx, toYear);
            return;
        }

        // 2. fromYear balance 조회 (없으면 계산)
        VacationBalance fromBalance = balanceRepository.findByUserIdxAndYear(userIdx, fromYear)
                .orElse(null);
        if (fromBalance == null) {
            log.debug("[월차 이월 스킵 - fromYear balance 없음] userIdx={}, fromYear={}", userIdx, fromYear);
            return;
        }

        BigDecimal fromRemaining = fromBalance.getRemainingDays();
        if (fromRemaining.compareTo(BigDecimal.ZERO) <= 0) {
            log.debug("[월차 이월 스킵 - 잔여 없음] userIdx={}, fromYear={}, remaining={}",
                    userIdx, fromYear, fromRemaining);
            return;
        }

        // 3. fromYear 유효 월차 합계 (toYearStart 기준으로 만료 전)
        //    sumValidMonthlyDays 에서 '월차'+'이월월차' 를 집계하므로 fromYear 의 실유효량 파악
        BigDecimal validMonthly = accrualScheduleRepository
                .sumValidMonthlyDays(userIdx, fromYear, toYearStart.minusDays(1));

        if (validMonthly.compareTo(BigDecimal.ZERO) <= 0) {
            log.debug("[월차 이월 스킵 - fromYear 유효월차 없음] userIdx={}, fromYear={}", userIdx, fromYear);
            return;
        }

        // 4. 이월 일수 = min(유효월차, 잔여일수)
        BigDecimal carryOverDays = validMonthly.min(fromRemaining);
        if (carryOverDays.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        // 5. 만료일: fromYear 유효 월차 중 가장 늦은 expiry_date 를 그대로 승계
        LocalDate expiryDate = accrualScheduleRepository
                .findMaxExpiryDateForValidMonthly(userIdx, fromYear, toYearStart.minusDays(1));
        if (expiryDate == null) {
            // fallback: fromYear 말일
            expiryDate = LocalDate.of(fromYear, 12, 31);
        }

        // 6. 이월월차 레코드 생성 (toYear 소속, 발생일 = toYear 1/1)
        VacationAccrualSchedule carryOverRecord = createAccrual(
                userIdx, toYear, toYearStart,
                VacationAccrualSchedule.TYPE_CARRY_OVER,
                carryOverDays,
                fromYear + "년 미사용 월차 이월 +" + carryOverDays.stripTrailingZeros().toPlainString() + "일",
                expiryDate,
                null);
        accrualScheduleRepository.save(carryOverRecord);

        log.info("[월차 이월 완료] userIdx={}, {}→{}년, 이월일수={}, 만료일={}",
                userIdx, fromYear, toYear, carryOverDays, expiryDate);
    }

    /**
     * 연차 발생 일정 생성 헬퍼 메서드
     */
    private VacationAccrualSchedule createAccrual(Long userIdx, Integer year, LocalDate accrualDate,
                                                   String accrualType, BigDecimal days,
                                                   String description, LocalDate expiryDate,
                                                   Long operatorUserIdx) {
        return VacationAccrualSchedule.builder()
                .userIdx(userIdx)
                .year(year)
                .accrualDate(accrualDate)
                .accrualType(accrualType)
                .days(days)
                .description(description)
                .expiryDate(expiryDate)
                .isExpired(false)
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

            // 근속가산 연차 계산 (만 3년, 5년, 7년... 누적 — 근로기준법 기준)
            // 1. 연초(1월 1일) 기준으로 이미 누적된 근속가산 계산
            int accumulatedBonusDays = 0;
            for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
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

            for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.getYear() == year && seniorityDate.isAfter(yearStart) && accumulatedBonusDays < 10) {
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

    /**
     * 해당 연도 사용 연차 계산 (vacation_request에서 직접 집계, 경조사와 기타 제외, 삭제되지 않은 문서만)
     */
    private BigDecimal calculateUsedDays(Long userIdx, int year) {
        List<VacationRequest> vacationRequests = vacationRequestRepository.findByUserIdxAndYear(userIdx, year);
        return calculateUsedDaysFromList(vacationRequests);
    }

    /**
     * 미리 조회된 연차 사용 내역 리스트에서 사용 일수 계산 (경조사·기타 제외).
     * computeAndSaveVacationBalance에서 DB 조회 1회로 usedDays + FIFO 계산을 공유하기 위해 사용.
     */
    private BigDecimal calculateUsedDaysFromList(List<VacationRequest> vacationRequests) {
        return vacationRequests.stream()
                .filter(vr -> vr.getVacationType() != null)
                .filter(vr -> !vr.getVacationType().contains("경조사") && !"기타".equals(vr.getVacationType()))
                .map(VacationRequest::getDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * 만료일 기준 FIFO로 실제 낭비된(사용 없이 만료된) 월차 일수 계산.
     * 미리 조회된 연차 사용 내역 리스트를 인메모리로 필터링하여 배치당 DB 쿼리를 제거.
     *
     * 배치를 만료일 오름차순으로 순회하며, 각 배치의 만료일 이전에
     * vacation_request에 기록된 사용분을 먼저 배분한다.
     * 앞 배치에 이미 배분된 사용분은 뒤 배치 계산에서 제외(누적 차감).
     *
     * 예) 배치A(5일, 만료 1/31), 배치B(1일, 만료 2/28)
     *     1/31 이전 사용 3일 → 배치A에서 3일 소진, 낭비 2일
     *     2/28 이전 사용 누계 4일(3+1) - 이미배분 3일 = 배치B에 1일 배분, 낭비 0일
     *     총 낭비 = 2일
     */
    private BigDecimal calculateExpiredUnusedByFifo(List<VacationRequest> yearRequests,
                                                     List<VacationAccrualSchedule> expiredBatches) {
        if (expiredBatches.isEmpty()) return BigDecimal.ZERO;

        // 경조사·기타 제외 필터를 미리 적용한 리스트 (sumDaysUsedOnOrBefore JPQL과 동일 조건)
        List<VacationRequest> filtered = yearRequests.stream()
                .filter(vr -> vr.getVacationType() != null)
                .filter(vr -> !vr.getVacationType().contains("경조사") && !"기타".equals(vr.getVacationType()))
                .toList();

        BigDecimal totalExpiredUnused = BigDecimal.ZERO;
        BigDecimal alreadyAttributed  = BigDecimal.ZERO;

        for (VacationAccrualSchedule batch : expiredBatches) {
            // 인메모리 필터: startDate <= batch.expiryDate (SQL의 v.startDate <= :cutoffDate 와 동일)
            BigDecimal usedBeforeExpiry = filtered.stream()
                    .filter(vr -> !vr.getStartDate().isAfter(batch.getExpiryDate()))
                    .map(VacationRequest::getDays)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            // 이 배치에 배분 가능한 사용량 = 만료일까지 누계 사용 - 앞 배치에 이미 배분된 양
            BigDecimal availableForBatch = usedBeforeExpiry.subtract(alreadyAttributed).max(BigDecimal.ZERO);
            BigDecimal usedFromBatch     = batch.getDays().min(availableForBatch);
            totalExpiredUnused = totalExpiredUnused.add(batch.getDays().subtract(usedFromBatch));
            alreadyAttributed  = alreadyAttributed.add(usedFromBatch);
        }

        return totalExpiredUnused;
    }

    /**
     * 월차 만료일별 FIFO 잔여 현황 계산
     *
     * FIFO 원칙: 만료일이 이른 배치부터 사용일수(totalUsedDays)를 소진.
     * 같은 만료일을 공유하는 accrual 레코드는 하나의 배치로 합산.
     *
     * @param userIdx       사용자 idx
     * @param year          조회 연도
     * @param effectiveDate 기준일 (현재 연도: 오늘, 과거/미래: 12/31)
     * @param totalUsedDays vacation_balance.used_days (이미 계산된 값)
     */
    private List<MonthlyLeaveExpiryDTO> computeMonthlyExpiryBreakdown(
            Long userIdx, Integer year, LocalDate effectiveDate, BigDecimal totalUsedDays) {

        List<VacationAccrualSchedule> schedules =
                accrualScheduleRepository.findMonthlyLeavesOrderByExpiryAsc(userIdx, year, effectiveDate);

        if (schedules.isEmpty()) return List.of();

        // 만료일 기준 합산 (LinkedHashMap → expiryDate ASC 순서 유지)
        Map<LocalDate, BigDecimal> issuedByExpiry = new LinkedHashMap<>();
        for (VacationAccrualSchedule s : schedules) {
            if (s.getExpiryDate() == null) continue;
            issuedByExpiry.merge(s.getExpiryDate(), s.getDays(), BigDecimal::add);
        }

        LocalDate today = LocalDate.now();
        BigDecimal remainingUsed = totalUsedDays != null ? totalUsedDays : BigDecimal.ZERO;
        List<MonthlyLeaveExpiryDTO> result = new ArrayList<>();

        for (Map.Entry<LocalDate, BigDecimal> entry : issuedByExpiry.entrySet()) {
            LocalDate expiry   = entry.getKey();
            BigDecimal issued  = entry.getValue();

            // FIFO: 이 배치에서 소진할 사용일수
            BigDecimal usedFromThis = remainingUsed.min(issued);
            remainingUsed = remainingUsed.subtract(usedFromThis).max(BigDecimal.ZERO);
            BigDecimal remaining = issued.subtract(usedFromThis);

            boolean expired      = expiry.isBefore(today);
            boolean expiringSoon = !expired && !expiry.isAfter(today.plusDays(30));

            result.add(MonthlyLeaveExpiryDTO.builder()
                    .expiryDate(expiry.toString())
                    .issued(issued)
                    .used(usedFromThis)
                    .remaining(remaining)
                    .expired(expired)
                    .expiringSoon(expiringSoon)
                    .build());
        }

        return result;
    }

    /**
     * 해당 연도 총 연차일수 계산 (기본연차 + 근속가산)
     */
    private BigDecimal calculateTotalDaysForYear(User user, int year) {
        LocalDate joinDate = user.getEmpJoinDate();
        if (joinDate == null) {
            return BigDecimal.ZERO;
        }

        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate oneYearAnniversary = joinDate.plusYears(1);
        long yearsOfServiceAtYearStart = ChronoUnit.YEARS.between(joinDate, yearStart);

        // Case 1: 1년 이상 근속자 - 기본연차 15일 + 근속가산
        if (yearsOfServiceAtYearStart >= 1) {
            BigDecimal total = new BigDecimal("15.0");

            // 연초 기준 누적 근속가산 (만 3년, 5년, 7년... — 근로기준법 기준)
            int accumulatedBonusDays = 0;
            for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.isBefore(yearStart) || seniorityDate.equals(yearStart)) {
                    accumulatedBonusDays++;
                    if (accumulatedBonusDays >= 10) {
                        accumulatedBonusDays = 10;
                        break;
                    }
                }
            }

            // 해당 연도 신규 발생 근속가산
            int newBonusDays = 0;
            for (int seniorityYear = 3; seniorityYear <= 21; seniorityYear += 2) {
                LocalDate seniorityDate = joinDate.plusYears(seniorityYear);
                if (seniorityDate.getYear() == year && seniorityDate.isAfter(yearStart) && accumulatedBonusDays < 10) {
                    newBonusDays = 1;
                    break;
                }
            }

            int totalServiceBonusDays = Math.min(accumulatedBonusDays + newBonusDays, 10);
            total = total.add(new BigDecimal(totalServiceBonusDays));

            log.info("[총 연차 계산] userIdx={}, year={}, base=15, servicebonus={}, total={}",
                    user.getIdx(), year, totalServiceBonusDays, total);
            return total;
        }

        // Case 2: 1년일이 해당 연도에 도래 - 월차 + 비례연차
        if (oneYearAnniversary.getYear() == year) {
            int monthlyEndMonth = oneYearAnniversary.getMonthValue() - 1;
            BigDecimal monthlyDays = new BigDecimal(monthlyEndMonth > 0 ? monthlyEndMonth : 0);

            int previousYear = joinDate.getYear();
            LocalDate previousYearEnd = LocalDate.of(previousYear, 12, 31);
            long daysInPreviousYear = previousYearEnd.isLeapYear() ? 366 : 365;
            long workedDaysInPreviousYear = ChronoUnit.DAYS.between(joinDate, previousYearEnd) + 1;

            BigDecimal proportionalDays = new BigDecimal(workedDaysInPreviousYear)
                    .divide(new BigDecimal(daysInPreviousYear), 2, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("15"))
                    .setScale(0, RoundingMode.HALF_UP);

            return monthlyDays.add(proportionalDays);
        }

        // Case 3: 1년 미만 - 월차만 (현재 시점까지 완료된 달만 계산)
        int joinMonth = joinDate.getMonthValue();
        int monthlyCount = 0;

        LocalDate now = LocalDate.now();
        LocalDate currentDate = now.getYear() == year ? now : LocalDate.of(year, 12, 31);

        if (joinDate.getYear() == year) {
            // 입사 연도: 입사월 다음 달부터 현재 월 이전까지
            int currentMonth = currentDate.getMonthValue();
            // 입사월 다음 달부터 현재 월 이전까지 (예: 2월 입사, 현재 4월 → 3월만 카운트 = 1일)
            monthlyCount = Math.max(0, currentMonth - joinMonth - 1);

            // 현재 달이 완료되었으면 (다음 달로 넘어갔으면) 카운트 추가
            if (currentDate.getDayOfMonth() >= joinDate.getDayOfMonth() + 1 || currentMonth > joinMonth + 1) {
                // 이미 위에서 계산했으므로 추가 필요 없음
            }

            // 간단히: 입사월+1 ~ 현재월-1 (현재 진행 중인 달 제외)
            // 예: 2월 입사, 현재 2월 → 0일
            // 예: 2월 입사, 현재 3월 → 0일 (2월 완료, 하지만 3월은 진행중이므로 아직 발생 안함)
            // 예: 2월 입사, 현재 4월 → 1일 (3월 완료로 1일 발생)
            monthlyCount = Math.max(0, currentMonth - joinMonth - 1);
        } else if (oneYearAnniversary.getYear() > year && joinDate.getYear() < year) {
            // 입사 다음 해 (1년 도래 전): 1월 ~ 현재 월 이전까지
            int currentMonth = currentDate.getMonthValue();
            monthlyCount = Math.max(0, currentMonth - 1); // 1월~(현재월-1)
        }

        log.info("[총 연차 계산 - Case3] userIdx={}, year={}, joinDate={}, monthlyCount={}",
                user.getIdx(), year, joinDate, monthlyCount);
        return new BigDecimal(monthlyCount);
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

        // 8. 신청 후 잔여 연차 계산 (vacation_balance 기반, 없으면 실시간 폴백)
        int currentYear = LocalDate.now().getYear();
        BigDecimal currentRemainingDays = balanceRepository.findByUserIdxAndYear(userIdx, currentYear)
                .map(VacationBalance::getRemainingDays)
                .orElseGet(() -> calculateTotalDaysForYear(user, currentYear)
                        .subtract(calculateUsedDays(userIdx, currentYear)));
        BigDecimal remainingDaysAfterApply = currentRemainingDays.subtract(totalRequestedDaysExcludingGyeongjosa);

        // 9. ApprovalDocument 생성 (문서 메타데이터)
        // 문서 제목: "연차 신청서 - {첫 번째 기간 시작일}"
        String title = "연차 신청서";
        if (!saveDTO.getPeriods().isEmpty()) {
            LocalDate firstStartDate = saveDTO.getPeriods().get(0).getStartDate();
            title = "연차 신청서 - " + firstStartDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        }

        // 문서번호 생성 (시퀀스 사용)
        String documentNo = documentSequenceService.generateDocumentNumber(CodeConstants.DocumentType.VACATION.getCode(), CodeConstants.DocumentType.VACATION.getPrefix(), userIdx);

        ApprovalDocument document = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType(CodeConstants.DocumentType.VACATION.getCode())
                .status(CodeConstants.DocumentStatus.DRAFTED.getCode())
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
            // 기타 유형은 사용자 선택값을, 그 외 유형은 항상 true(캘린더 등록)
            boolean etcCal = "기타".equals(period.getVacationType())
                    ? (saveDTO.getEtcAddToCalendar() != null && saveDTO.getEtcAddToCalendar())
                    : true;

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
                    .etcCal(etcCal)
                    .isApproved(false)   // 신청 시점엔 항상 미승인 상태
                    .isProxyRequest(false)  // 일반 신청은 false (대리 신청은 saveProxyVacationRequest 에서 UPDATE)
                    .applyDate(LocalDate.now())
                    .createdUserIdx(userIdx)
                    .updatedUserIdx(userIdx)
                    .build();

            vacationRequestRepository.save(vacationRequest);
            log.info("[연차 기간 저장] startDate: {}, endDate: {}, days: {}, type: {}",
                    period.getStartDate(), period.getEndDate(), period.getDays(), period.getVacationType());
            // 캘린더 일정은 관리자 승인 시 생성됩니다.
        }

        // 11. vacation_balance 즉시 갱신 (신청된 연도별 UPSERT)
        try {
            Set<Integer> affectedYears = new HashSet<>();
            for (VacationRequestSaveDTO.VacationPeriod p : saveDTO.getPeriods()) {
                affectedYears.add(p.getStartDate().getYear());
            }
            for (Integer affectedYear : affectedYears) {
                computeAndSaveVacationBalance(userIdx, affectedYear);
            }
            log.info("[vacation_balance 갱신 완료 - 신청] userIdx={}, years={}", userIdx, affectedYears);
        } catch (Exception e) {
            log.error("[vacation_balance 갱신 실패 - 신청] userIdx={}, error={}", userIdx, e.getMessage());
            // balance 갱신 실패는 연차 신청 롤백 없음 (스케줄러 00:10에 자동 보정)
        }

            // 12. 전자서명 도입 후 — 저장 시점에는 PDF를 생성하지 않음
            //     - 카테고리 A(연차) 최종본은 전자서명 완료 + 대표이사 수기 서명 후 스캔 업로드로 생성
            //     - 과거 자동 PDF 생성 로직은 제거됨 (기존 VacationOfficialPdf 조회/다운로드는 유지)

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

    @Override
    @Transactional
    public Long saveProxyVacationRequest(Long adminUserIdx,
                                         com.pinecni.erp.api.vacation.dto.AdminProxyVacationRequestDTO dto) {
        log.info("[관리자 대리 연차 신청] adminUserIdx: {}, targetUserIdx: {}, type: {}, {} ~ {}",
                adminUserIdx, dto.getTargetUserIdx(), dto.getVacationType(), dto.getStartDate(), dto.getEndDate());

        // 1. 입력값 기본 검증
        if (dto.getTargetUserIdx() == null) {
            throw new IllegalArgumentException("대상 사용자를 선택해주세요.");
        }
        if (dto.getVacationType() == null || dto.getVacationType().isBlank()) {
            throw new IllegalArgumentException("연차 유형을 선택해주세요.");
        }
        if (dto.getStartDate() == null || dto.getEndDate() == null) {
            throw new IllegalArgumentException("시작일과 종료일을 입력해주세요.");
        }
        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("종료일은 시작일 이후여야 합니다.");
        }
        if (dto.getDays() == null || dto.getDays().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("일수가 올바르지 않습니다.");
        }
        if (dto.getReason() == null || dto.getReason().isBlank()) {
            throw new IllegalArgumentException("사유는 필수입니다.");
        }

        // 반차는 시작일=종료일 이어야 함
        if (dto.getVacationType().contains("반차") && !dto.getStartDate().equals(dto.getEndDate())) {
            throw new IllegalArgumentException("반차는 단일 날짜만 가능합니다.");
        }

        Long targetUserIdx = dto.getTargetUserIdx();
        User targetUser = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new IllegalArgumentException("대상 사용자를 찾을 수 없습니다: " + targetUserIdx));

        // 2. 기존 saveVacationRequest 호출용 DTO 구성 (검증/잔여계산/문서생성/행 저장 재사용)
        //    - allowMinusVacation=true: 사후 기록이라 잔여 부족해도 통과
        //    - specialApprovalReason: 자동 채움
        VacationRequestSaveDTO.VacationPeriod period = VacationRequestSaveDTO.VacationPeriod.builder()
                .vacationType(dto.getVacationType())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .days(dto.getDays())
                .build();

        // 사유는 위에서 필수 검증을 통과했으므로 그대로 사용
        String reason = dto.getReason().trim();

        VacationRequestSaveDTO innerDto = VacationRequestSaveDTO.builder()
                .reason(reason)
                .allowMinusVacation(true)
                .specialApprovalReason("관리자 권한 등록 (잔여 부족 시 마이너스 연차 자동 허용)")
                .periods(List.of(period))
                .etcAddToCalendar(true)
                .build();

        Long documentIdx = saveVacationRequest(targetUserIdx, innerDto);
        log.info("[대리 신청 - 내부 saveVacationRequest 완료] documentIdx: {}", documentIdx);

        // 3. 대리 등록 메타데이터 갱신 (is_proxy_request, created_user_idx)
        int marked = vacationRequestRepository.markAsProxyByDocumentIdx(documentIdx, adminUserIdx);
        log.info("[대리 신청 - 행 메타데이터 갱신] documentIdx: {}, 갱신 행 수: {}", documentIdx, marked);

        // ApprovalDocument 의 createdUserIdx/updatedUserIdx 도 관리자로 덮어씀 (감사 추적)
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new IllegalStateException("대리 신청 직후 문서 조회 실패: " + documentIdx));
        document.setCreatedUserIdx(adminUserIdx);
        document.setUpdatedUserIdx(adminUserIdx);
        approvalDocumentRepository.save(document);

        // 4. 전자서명 도입 후 — 대리 신청도 저장 시점에 PDF를 생성하지 않음
        //    대리 신청(관리자 생성)은 아래 5단계에서 바로 자동 승인 처리됨 (예외 플로우)

        // 5. 자동 승인 + 캘린더 일정 생성 (기존 승인 흐름 재사용)
        try {
            approveVacation(documentIdx, adminUserIdx, true);
            log.info("[대리 신청 - 자동 승인 + 캘린더 등록 완료] documentIdx: {}", documentIdx);
        } catch (Exception e) {
            log.error("[대리 신청 - 자동 승인 실패] documentIdx: {}, error: {}", documentIdx, e.getMessage(), e);
            throw new RuntimeException("대리 신청은 저장되었으나 자동 승인 처리 중 오류가 발생했습니다. 목록에서 수동 승인해주세요.", e);
        }

        return documentIdx;
    }

    /**
     * 관리자 승인 시 VacationRequest 엔티티로 캘린더 일정 생성
     * - 승인 실패해도 승인 처리 자체는 롤백되지 않도록 예외를 삼킴
     */
    private String resolveDocumentStatusName(String statusCode) {
        if (statusCode == null) return CodeConstants.DocumentStatus.DRAFTED.getName();
        try {
            return CodeConstants.DocumentStatus.fromCode(statusCode).getName();
        } catch (IllegalArgumentException e) {
            return statusCode;
        }
    }

    private void createCalendarEventForVacationRequest(VacationRequest vr, User user) {
        try {
            log.info("[캘린더 일정 생성 시작] userIdx: {}, documentIdx: {}, vacationType: {}, startDate: {}, endDate: {}",
                    vr.getUserIdx(), vr.getDocumentIdx(), vr.getVacationType(), vr.getStartDate(), vr.getEndDate());

            String eventTitle = getVacationTypeTitle(vr.getVacationType(), user.getEmpName());
            log.info("[이벤트 제목 생성] eventTitle: {}", eventTitle);

            String groupId = UUID.randomUUID().toString();

            CalendarEvent calendarEvent = CalendarEvent.builder()
                    .eventTitle(eventTitle)
                    .eventType("leave")
                    .eventDescription(vr.getReason())
                    .startDate(vr.getStartDate())
                    .endDate(vr.getEndDate())
                    .startTime(null)
                    .endTime(null)
                    .isAllDay(true)
                    .location(null)
                    .approvalIdx(vr.getDocumentIdx())
                    .groupId(groupId)
                    .teamIdx(null)
                    .notificationYn("N")
                    .notificationMinutes(null)
                    .isRecurring(false)
                    .recurringType(null)
                    .recurringEndDate(null)
                    .status("ACTIVE")
                    .createdAt(LocalDateTime.now())
                    .createdUserIdx(vr.getUserIdx())
                    .updatedAt(LocalDateTime.now())
                    .updatedUserIdx(vr.getUserIdx())
                    .build();

            CalendarEvent savedEvent = calendarEventRepository.save(calendarEvent);
            log.info("[캘린더 일정 저장 성공] eventIdx: {}, eventTitle: {}, startDate: {}, endDate: {}",
                    savedEvent.getIdx(), eventTitle, vr.getStartDate(), vr.getEndDate());

            CalendarParticipant participant = CalendarParticipant.builder()
                    .eventIdx(savedEvent.getIdx())
                    .userIdx(vr.getUserIdx())
                    .userName(user.getEmpName())
                    .participationStatus("PENDING")
                    .receiveNotification("Y")
                    .createdAt(LocalDateTime.now())
                    .build();

            calendarParticipantRepository.save(participant);
            log.info("[캘린더 일정 생성 완료] ✓ eventIdx: {}, title: {}", savedEvent.getIdx(), eventTitle);

        } catch (Exception e) {
            log.error("========================================");
            log.error("[캘린더 일정 생성 실패] ❌❌❌");
            log.error("userIdx: {}", vr.getUserIdx());
            log.error("documentIdx: {}", vr.getDocumentIdx());
            log.error("vacationType: {}", vr.getVacationType());
            log.error("startDate: {}, endDate: {}", vr.getStartDate(), vr.getEndDate());
            log.error("Exception Type: {}", e.getClass().getName());
            log.error("Error Message: {}", e.getMessage());
            log.error("Stack Trace:", e);
            log.error("========================================");
        }
    }

    /**
     * 연차신청서 documentIdx(= calendar_events.approval_idx)에 연결된 캘린더 일정 soft delete.
     * - deleteVacation, approveVacation(취소/재승인 전 정리) 양쪽에서 재사용.
     * - 날짜 범위 기반 조회 대신 approval_idx 기반으로 정확히 해당 문서의 이벤트만 삭제.
     */
    private void deleteCalendarEventsForRequests(Long documentIdx, Long operatorUserIdx) {
        List<CalendarEvent> events = calendarEventRepository.findByApprovalIdx(documentIdx);
        if (events.isEmpty()) {
            log.info("[캘린더 일정 삭제 스킵] 연결된 활성 이벤트 없음. documentIdx: {}", documentIdx);
            return;
        }

        int deletedCount = 0;
        for (CalendarEvent event : events) {
            event.setDeletedAt(LocalDateTime.now());
            event.setDeletedUserIdx(operatorUserIdx);
            calendarEventRepository.save(event);
            deletedCount++;
            log.info("[캘린더 일정 삭제] eventIdx: {}, title: {}, startDate: {}, endDate: {}",
                    event.getIdx(), event.getEventTitle(), event.getStartDate(), event.getEndDate());
        }

        log.info("[캘린더 일정 삭제 완료] documentIdx: {}, 삭제된 일정 수: {}", documentIdx, deletedCount);
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
     * vacation_balance에서 잔여 연차 조회. 행 없으면 실시간 계산으로 폴백.
     */
    private void validateRemainingVacation(Long userIdx, BigDecimal totalRequestedDays,
                                           Boolean allowMinusVacation) {
        int currentYear = LocalDate.now().getYear();

        // vacation_balance에서 잔여 연차 조회
        BigDecimal remainingDays = balanceRepository.findByUserIdxAndYear(userIdx, currentYear)
                .map(VacationBalance::getRemainingDays)
                .orElseGet(() -> {
                    User u = userRepository.findById(userIdx)
                            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userIdx));
                    return calculateTotalDaysForYear(u, currentYear)
                            .subtract(calculateUsedDays(userIdx, currentYear));
                });

        // 연차 차감 대상 일수가 없으면 검증 불필요 (기타사유 등 전부 제외된 경우)
        if (totalRequestedDays.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("[잔여 연차 검증 생략] userIdx: {}, 차감 대상 일수 없음 (기타사유 등)", userIdx);
            return;
        }

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
                .role("담당")
                .build());

        // 8-2. 부서장 (기안자의 보고체계 상위보고자)
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
                        .role("부서장")
                        .build());
            }
        }

        // 8-3. 대표이사 (직급코드 CEO 고정 - 전직원 공통)
        User ceo = userRepository.findActiveByEmpPosition(CodeConstants.Position.CEO.getCode())
                .stream().findFirst().orElse(null);
        if (ceo != null) {
            String ceoPositionName = codeRepository.findByCode(ceo.getEmpPosition())
                    .map(Code::getCodeName)
                    .orElse(ceo.getEmpPosition());

            approvers.add(com.pinecni.erp.api.vacation.dto.VacationDetailDTO.ApproverDTO.builder()
                    .userIdx(ceo.getIdx())
                    .name(ceo.getEmpName())
                    .position(ceoPositionName)
                    .role("대표이사")
                    .build());
        } else {
            log.warn("대표이사(Position.CEO={})를 찾을 수 없습니다. documentIdx: {}", CodeConstants.Position.CEO.getCode(), documentIdx);
        }

        // 9. 사유 (첫 번째 요청의 reason 사용)
        String reason = vacationRequests.getFirst().getReason();

        // 10. 승인 상태 조회 (같은 documentIdx의 첫 번째 행 기준)
        Boolean isApproved = vacationRequests.getFirst().getIsApproved();

        // 11. DTO 생성
        com.pinecni.erp.api.vacation.dto.VacationDetailDTO detailDTO = com.pinecni.erp.api.vacation.dto.VacationDetailDTO.builder()
                .documentIdx(documentIdx)
                .documentNo(document.getDocumentNo())
                .applyDate(vacationRequests.getFirst().getApplyDate())
                .drafterUserIdx(document.getDrafterUserIdx())
                .drafterName(drafter.getEmpName())
                .drafterNameSpaced(drafter.getEmpName() != null
                        ? String.join(" ", drafter.getEmpName().split("")) : "")
                .drafterDept(deptName)
                .drafterPosition(positionName)
                .drafterAddress(drafter.getEmpAddress() != null ? drafter.getEmpAddress() : "")
                .drafterBirthDate(drafter.getEmpBirth() != null
                        ? drafter.getEmpBirth().format(java.time.format.DateTimeFormatter.ofPattern("yyyy년 MM월 dd일")) : "")
                .drafterPhone(drafter.getEmpPhone() != null ? drafter.getEmpPhone() : "")
                .remainingDays(remainingDays)
                .reason(reason)
                .isApproved(isApproved != null ? isApproved : false)
                .statusCode(document.getStatus() != null ? document.getStatus()
                        : CodeConstants.DocumentStatus.DRAFTED.getCode())
                .statusName(resolveDocumentStatusName(document.getStatus()))
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
    public void deleteVacation(Long documentIdx, Long currentUserIdx, boolean isAdmin) {
        log.info("[연차신청서 삭제 시작] documentIdx: {}, currentUserIdx: {}, isAdmin: {}", documentIdx, currentUserIdx, isAdmin);

        // 1. ApprovalDocument 조회
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("문서를 찾을 수 없습니다. documentIdx: " + documentIdx));

        // 2. Soft delete 확인
        if (document.getDeletedAt() != null) {
            throw new IllegalStateException("이미 삭제된 문서입니다.");
        }

        // 2-1. 전자서명 게이트: 관리자가 아닌 경우에만 차단
        if (!isAdmin && signatureService.hasAnySignatureCaptured(documentIdx)) {
            throw new IllegalStateException("전자서명이 진행된 문서는 삭제할 수 없습니다.\n삭제가 필요하면 관리부에 문의해주세요.");
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
        log.info("[연차 잔액 복구] VacationRequest 삭제로 자동 반영됨 (calculateUsedDays에서 집계 시 제외됨)");

        // 6. 캘린더 일정 삭제 (승인 여부와 무관하게 문서 삭제 시 정리)
        deleteCalendarEventsForRequests(documentIdx, currentUserIdx);

        // 7. vacation_balance 즉시 갱신 (소프트 삭제 반영)
        if (!vacationRequests.isEmpty()) {
            Long vacationUserIdx = vacationRequests.get(0).getUserIdx();
            try {
                Set<Integer> affectedYears = new HashSet<>();
                for (VacationRequest vr : vacationRequests) {
                    affectedYears.add(vr.getStartDate().getYear());
                }
                for (Integer affectedYear : affectedYears) {
                    computeAndSaveVacationBalance(vacationUserIdx, affectedYear);
                }
                log.info("[vacation_balance 갱신 완료 - 삭제] userIdx={}, years={}", vacationUserIdx, affectedYears);
            } catch (Exception e) {
                log.error("[vacation_balance 갱신 실패 - 삭제] documentIdx={}, error={}", documentIdx, e.getMessage());
            }
        }

        // 8. 알림 발송 — 관리자가 본인 외 사용자의 연차를 삭제한 경우 신청자에게 통보 (C1907)
        if (isAdmin && !vacationRequests.isEmpty()) {
            try {
                Long vacationUserIdx = vacationRequests.get(0).getUserIdx();
                enqueueVacationAdminDeletedNotification(document, vacationRequests,
                        vacationUserIdx, currentUserIdx);
            } catch (Exception e) {
                log.warn("[연차 관리자삭제 알림 enqueue 실패 — 무시하고 진행] documentIdx={}, error={}",
                        documentIdx, e.getMessage());
            }
        }

        log.info("[연차신청서 삭제 완료] documentIdx: {}, 연차 기간 수: {}, 복구 일수: {}일",
                documentIdx, vacationRequests.size(), totalDaysToRestore);
    }

    @Override
    @Transactional
    public void approveVacation(Long documentIdx, Long approverUserIdx, boolean approve) {
        approveVacation(documentIdx, approverUserIdx, approve, null);
    }

    @Override
    @Transactional
    public void approveVacation(Long documentIdx, Long approverUserIdx, boolean approve, String rejectReason) {
        log.info("[연차 승인 처리 시작] documentIdx: {}, approverUserIdx: {}, approve: {}, hasReason: {}",
                documentIdx, approverUserIdx, approve, rejectReason != null && !rejectReason.isBlank());

        // 1. 해당 문서의 연차 신청 행 존재 여부 확인
        List<VacationRequest> vacationRequests = vacationRequestRepository.findByDocumentIdx(documentIdx);
        if (vacationRequests.isEmpty()) {
            throw new IllegalArgumentException("연차 신청서를 찾을 수 없습니다. documentIdx: " + documentIdx);
        }

        // 2. 삭제된 문서인지 확인
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("문서를 찾을 수 없습니다. documentIdx: " + documentIdx));
        if (document.getDeletedAt() != null) {
            throw new IllegalStateException("삭제된 문서는 승인할 수 없습니다.");
        }

        // 3. 승인 상태 일괄 업데이트 (같은 documentIdx의 모든 기간 행)
        LocalDateTime approvedAt = approve ? LocalDateTime.now() : null;
        Long resolvedApproverIdx = approve ? approverUserIdx : null;
        int updatedCount = vacationRequestRepository.updateApprovalByDocumentIdx(
                documentIdx, approve, approvedAt, resolvedApproverIdx);

        // 3-1. 문서 상태 전이 (C05 코드)
        document.setStatus(approve
                ? CodeConstants.DocumentStatus.APPROVED.getCode()
                : CodeConstants.DocumentStatus.REJECTED.getCode());
        approvalDocumentRepository.save(document);

        log.info("[연차 DB 상태 업데이트 완료] documentIdx: {}, approve: {}, 업데이트된 행 수: {}, 문서상태: {}",
                documentIdx, approve, updatedCount, document.getStatus());

        // 4. 캘린더 일정 처리
        Long vacationUserIdx = vacationRequests.get(0).getUserIdx();
        User user = userRepository.findById(vacationUserIdx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. userIdx: " + vacationUserIdx));

        if (approve) {
            // 4-1. 승인 → 기존 이벤트 먼저 정리 (재승인 시 중복 방지) 후 새로 생성
            log.info("[캘린더 일정 기존 정리] documentIdx: {}", documentIdx);
            deleteCalendarEventsForRequests(documentIdx, approverUserIdx);

            log.info("[캘린더 일정 생성 시작] documentIdx: {}, 기간 수: {}", documentIdx, vacationRequests.size());
            for (VacationRequest vr : vacationRequests) {
                boolean shouldCreate = vr.getEtcCal() == null || vr.getEtcCal();
                if (shouldCreate) {
                    createCalendarEventForVacationRequest(vr, user);
                } else {
                    log.info("[캘린더 등록 스킵] 기타 휴가 - 사용자가 캘린더 등록 미선택. vacationIdx: {}", vr.getIdx());
                }
            }
            log.info("[캘린더 일정 생성 완료] documentIdx: {}", documentIdx);
        } else {
            // 4-2. 승인 취소 → 연결된 캘린더 일정 삭제
            log.info("[캘린더 일정 삭제 시작 - 승인 취소] documentIdx: {}", documentIdx);
            deleteCalendarEventsForRequests(documentIdx, approverUserIdx);
        }

        // 5. vacation_balance 즉시 갱신
        try {
            Set<Integer> affectedYears = new HashSet<>();
            for (VacationRequest vr : vacationRequests) {
                affectedYears.add(vr.getStartDate().getYear());
            }
            for (Integer affectedYear : affectedYears) {
                computeAndSaveVacationBalance(vacationUserIdx, affectedYear);
            }
            log.info("[vacation_balance 갱신 완료 - 승인] documentIdx={}, approve={}, years={}",
                    documentIdx, approve, affectedYears);
        } catch (Exception e) {
            log.error("[vacation_balance 갱신 실패 - 승인] documentIdx={}, error={}", documentIdx, e.getMessage());
        }

        // 6. 알림 발송 — 신청자에게 승인/반려 결과 통보 (C1905/C1906)
        try {
            enqueueVacationApprovalNotification(document, vacationRequests, vacationUserIdx,
                    approverUserIdx, approve, rejectReason);
        } catch (Exception e) {
            log.warn("[연차 알림 enqueue 실패 — 무시하고 진행] documentIdx={}, error={}",
                    documentIdx, e.getMessage());
        }

        log.info("[연차 승인 처리 완료] documentIdx: {}, approve: {}", documentIdx, approve);
    }

    // =========================================================================
    // 알림 enqueue 헬퍼 (Phase 5)
    // =========================================================================

    /**
     * C1905/C1906 — 연차 승인/반려 결과를 신청자에게.
     * 자기 자신에게 가는 알림은 SKIP (관리자가 본인 연차를 직접 처리하는 경우).
     */
    private void enqueueVacationApprovalNotification(ApprovalDocument document,
                                                     List<VacationRequest> vacationRequests,
                                                     Long vacationUserIdx,
                                                     Long approverUserIdx,
                                                     boolean approve,
                                                     String rejectReason) {
        if (vacationUserIdx == null) return;

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        LocalDate start = vacationRequests.stream().map(VacationRequest::getStartDate)
                .min(LocalDate::compareTo).orElse(null);
        LocalDate end = vacationRequests.stream().map(VacationRequest::getEndDate)
                .max(LocalDate::compareTo).orElse(null);
        BigDecimal totalDays = vacationRequests.stream().map(VacationRequest::getDays)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

        String actorName = userRepository.findById(approverUserIdx)
                .map(User::getEmpName).orElse("관리자");

        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("documentTitle", nullSafe(document.getTitle(), "연차신청서"));
        vars.put("documentNo",    nullSafe(document.getDocumentNo(), ""));
        vars.put("vacationStart", start != null ? start.format(dateFmt) : "-");
        vars.put("vacationEnd",   end   != null ? end.format(dateFmt)   : "-");
        vars.put("vacationDays",  totalDays.stripTrailingZeros().toPlainString());
        vars.put("actorName",     actorName);
        vars.put("eventTime",     LocalDateTime.now().format(timeFmt));
        vars.put("rejectReason",  approve
                ? ""
                : (rejectReason != null && !rejectReason.isBlank()
                        ? rejectReason
                        : "(상세 사유는 처리자에게 문의해 주세요)"));
        vars.put("deepLink",      "/vacation");

        String type = approve
                ? "C1905"   // 연차승인
                : "C1906";  // 연차반려

        notificationEnqueueService.enqueue(
                com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                        .notificationType(type)
                        .channel("C2101")
                        .channel("C2103")
                        .recipientUserIdx(vacationUserIdx)
                        .actorUserIdx(approverUserIdx)
                        .targetType("C1701")  // approval_documents
                        .targetIdx(document.getIdx())
                        .documentIdx(document.getIdx())
                        .variables(vars)
                        .dedupKey("VAC-APPROVE:" + document.getIdx() + ":" + (approve ? "OK" : "NG"))
                        .build());
    }

    /**
     * C1907 — 관리자가 신청자의 연차를 삭제했을 때.
     * 호출은 deleteVacation 안에서 isAdmin=true 일 때만.
     */
    private void enqueueVacationAdminDeletedNotification(ApprovalDocument document,
                                                         List<VacationRequest> vacationRequests,
                                                         Long vacationUserIdx,
                                                         Long actorUserIdx) {
        if (vacationUserIdx == null) return;

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        LocalDate start = vacationRequests.stream().map(VacationRequest::getStartDate)
                .min(LocalDate::compareTo).orElse(null);
        LocalDate end = vacationRequests.stream().map(VacationRequest::getEndDate)
                .max(LocalDate::compareTo).orElse(null);

        String actorName = userRepository.findById(actorUserIdx)
                .map(User::getEmpName).orElse("관리자");

        Map<String, Object> vars = new LinkedHashMap<>();
        vars.put("documentTitle", nullSafe(document.getTitle(), "연차신청서"));
        vars.put("documentNo",    nullSafe(document.getDocumentNo(), ""));
        vars.put("vacationStart", start != null ? start.format(dateFmt) : "-");
        vars.put("vacationEnd",   end   != null ? end.format(dateFmt)   : "-");
        vars.put("actorName",     actorName);
        vars.put("eventTime",     LocalDateTime.now().format(timeFmt));
        vars.put("deepLink",      "/vacation");

        notificationEnqueueService.enqueue(
                com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                        .notificationType("C1907")
                        .channel("C2101")
                        .channel("C2103")
                        .recipientUserIdx(vacationUserIdx)
                        .actorUserIdx(actorUserIdx)
                        .targetType("C1701")
                        .targetIdx(document.getIdx())
                        .documentIdx(document.getIdx())
                        .variables(vars)
                        .dedupKey("VAC-ADMIN-DEL:" + document.getIdx())
                        .build());
    }

    private static String nullSafe(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s;
    }

}
