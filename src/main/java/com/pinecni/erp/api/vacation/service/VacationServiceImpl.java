package com.pinecni.erp.api.vacation.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.vacation.dto.VacationUserInfoDTO;
import com.pinecni.erp.api.vacation.repository.VacationBalanceRepository;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.entity.VacationBalance;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Vacation Service Implementation
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class VacationServiceImpl implements VacationService {

    private final UserRepository userRepository;
    private final VacationBalanceRepository vacationBalanceRepository;
    private final CodeRepository codeRepository;

    @Override
    public VacationUserInfoDTO getUserVacationInfo(Long userIdx, Integer year) {
        // 사용자 정보 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다. userIdx: " + userIdx));

        // 연차 잔액 조회
        VacationBalance balance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, year)
                .orElse(VacationBalance.builder()
                        .userIdx(userIdx)
                        .year(year)
                        .totalDays(new BigDecimal("15.0"))
                        .usedDays(BigDecimal.ZERO)
                        .remainingDays(new BigDecimal("15.0"))
                        .build());

        // 부서명 조회 (C01 그룹)
        String empDeptName = null;
        if (user.getEmpDept() != null) {
            empDeptName = codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                    .map(code -> code.getCodeName())
                    .orElse(user.getEmpDept()); // 코드명을 찾지 못하면 코드값 그대로 사용
        }

        // 직급명 조회 (C02 그룹)
        String empPositionName = null;
        if (user.getEmpPosition() != null) {
            empPositionName = codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                    .map(code -> code.getCodeName())
                    .orElse(user.getEmpPosition()); // 코드명을 찾지 못하면 코드값 그대로 사용
        }

        // DTO 생성
        return VacationUserInfoDTO.builder()
                .userIdx(user.getIdx())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empDeptName(empDeptName)
                .empPosition(user.getEmpPosition())
                .empPositionName(empPositionName)
                .empAddress(user.getEmpAddress() != null ? user.getEmpAddress() : "")
                .empBirth(user.getEmpBirth() != null ? user.getEmpBirth().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "")
                .empPhone(user.getEmpPhone() != null ? user.getEmpPhone() : "")
                .totalDays(balance.getTotalDays())
                .usedDays(balance.getUsedDays())
                .remainingDays(balance.getRemainingDays())
                .year(balance.getYear())
                .build();
    }

    @Override
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public VacationBalance calculateAndSaveVacationBalance(Long userIdx, Integer year) {
        log.info("연차 계산 시작 - userIdx: {}, year: {}", userIdx, year);

        // 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다. userIdx: " + userIdx));

        // 재직 중인지 확인
        if (!"재직".equals(user.getEmpStatus())) {
            throw new RuntimeException("재직 중인 사용자만 연차를 계산할 수 있습니다. userIdx: " + userIdx);
        }

        // 연차 일수 계산
        BigDecimal calculatedDays = calculateVacationDays(userIdx, year);

        // 기존 VacationBalance 조회 또는 생성
        VacationBalance balance = vacationBalanceRepository.findByUserIdxAndYear(userIdx, year)
                .orElse(VacationBalance.builder()
                        .userIdx(userIdx)
                        .year(year)
                        .usedDays(BigDecimal.ZERO)
                        .createdUserIdx(1L) // TODO: 현재 로그인 사용자
                        .createdAt(LocalDateTime.now())
                        .build());

        // 총 연차 일수 업데이트
        balance.setTotalDays(calculatedDays);

        // 남은 연차 일수 계산 (총 연차 - 사용한 연차)
        BigDecimal remainingDays = calculatedDays.subtract(balance.getUsedDays());
        balance.setRemainingDays(remainingDays);

        balance.setUpdatedUserIdx(1L); // TODO: 현재 로그인 사용자
        balance.setUpdatedAt(LocalDateTime.now());

        // 저장
        VacationBalance saved = vacationBalanceRepository.save(balance);
        log.info("연차 계산 완료 - userIdx: {}, year: {}, totalDays: {}",
                userIdx, year, calculatedDays);

        return saved;
    }

    @Override
    public BigDecimal calculateVacationDays(Long userIdx, Integer year) {
        // 사용자 조회
        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다. userIdx: " + userIdx));

        LocalDate joinDate = user.getEmpJoinDate();
        if (joinDate == null) {
            throw new RuntimeException("입사일 정보가 없습니다. userIdx: " + userIdx);
        }

        // 기준일: 해당 연도의 1월 1일
        LocalDate targetYearStart = LocalDate.of(year, 1, 1);

        // 근속 연수 계산 (기준일 기준)
        long yearsOfService = ChronoUnit.YEARS.between(joinDate, targetYearStart);

        log.debug("연차 계산 상세 - userIdx: {}, joinDate: {}, targetYear: {}, yearsOfService: {}",
                userIdx, joinDate, year, yearsOfService);

        BigDecimal vacationDays;

        if (yearsOfService < 1) {
            // 1년 미만 근속자: 월 단위 연차 (30일마다 1개)
            vacationDays = calculateFirstYearVacation(joinDate, year);
        } else {
            // 1년 이상 근속자: 기본 15개 + 첫 해 비례 + 근속 연수별 추가
            vacationDays = calculateRegularVacation(joinDate, year, yearsOfService);
        }

        // 최대 25개 제한
        if (vacationDays.compareTo(new BigDecimal("25")) > 0) {
            vacationDays = new BigDecimal("25");
        }

        log.debug("계산된 연차 일수 - userIdx: {}, year: {}, vacationDays: {}",
                userIdx, year, vacationDays);

        return vacationDays;
    }

    /**
     * 1년 미만 근속자 연차 계산
     * - 30일마다 1개 발생 (최대 11개)
     */
    private BigDecimal calculateFirstYearVacation(LocalDate joinDate, Integer year) {
        LocalDate yearEnd = LocalDate.of(year, 12, 31);
        LocalDate oneYearFromJoin = joinDate.plusYears(1);

        // 계산 종료일: 해당 연도 말 또는 입사 1년 후 중 빠른 날짜
        LocalDate calculateUntil = yearEnd.isBefore(oneYearFromJoin) ? yearEnd : oneYearFromJoin.minusDays(1);

        // 입사일부터 계산 종료일까지의 개월 수
        long monthsWorked = ChronoUnit.MONTHS.between(joinDate, calculateUntil.plusDays(1));

        // 월 단위 연차는 최대 11개
        long vacationCount = Math.min(monthsWorked, 11);

        log.debug("1년 미만 연차 계산 - joinDate: {}, calculateUntil: {}, monthsWorked: {}, vacationCount: {}",
                joinDate, calculateUntil, monthsWorked, vacationCount);

        return new BigDecimal(vacationCount);
    }

    /**
     * 1년 이상 근속자 연차 계산
     * - 기본 15개
     * - 첫 해 비례 연차: (입사 해 근무일 수 / 입사 해 전체 일 수) * 15
     * - 2년마다 1개 추가
     */
    private BigDecimal calculateRegularVacation(LocalDate joinDate, Integer year, long yearsOfService) {
        // 1. 기본 연차 15개
        BigDecimal baseVacation = new BigDecimal("15");

        // 2. 첫 해 비례 연차 계산
        BigDecimal firstYearProportional = calculateFirstYearProportionalVacation(joinDate);

        // 3. 근속 연수별 추가 연차 (2년마다 1개)
        long additionalYears = yearsOfService / 2;
        BigDecimal seniorityBonus = new BigDecimal(additionalYears);

        BigDecimal totalVacation = baseVacation.add(firstYearProportional).add(seniorityBonus);

        log.debug("1년 이상 연차 계산 - yearsOfService: {}, base: {}, firstYear: {}, seniority: {}, total: {}",
                yearsOfService, baseVacation, firstYearProportional, seniorityBonus, totalVacation);

        return totalVacation;
    }

    /**
     * 첫 해 비례 연차 계산
     * (입사 해 근무일 수 / 입사 해 전체 일 수) * 15
     */
    private BigDecimal calculateFirstYearProportionalVacation(LocalDate joinDate) {
        int joinYear = joinDate.getYear();

        // 입사 해의 전체 일 수
        LocalDate yearStart = LocalDate.of(joinYear, 1, 1);
        LocalDate yearEnd = LocalDate.of(joinYear, 12, 31);
        long totalDaysInYear = ChronoUnit.DAYS.between(yearStart, yearEnd) + 1;

        // 입사일부터 연말까지 근무일 수
        long workedDays = ChronoUnit.DAYS.between(joinDate, yearEnd) + 1;

        // 비례 연차 = (근무일 수 / 전체 일 수) * 15
        BigDecimal workedRatio = new BigDecimal(workedDays)
                .divide(new BigDecimal(totalDaysInYear), 2, RoundingMode.HALF_UP);

        BigDecimal proportionalVacation = workedRatio.multiply(new BigDecimal("15"))
                .setScale(1, RoundingMode.HALF_UP);

        log.debug("첫 해 비례 연차 - joinYear: {}, totalDays: {}, workedDays: {}, ratio: {}, proportional: {}",
                joinYear, totalDaysInYear, workedDays, workedRatio, proportionalVacation);

        return proportionalVacation;
    }

    @Override
    @Transactional
    public int calculateAndSaveAllVacationBalances(Integer year) {
        log.info("전체 사용자 연차 계산 시작 - year: {}", year);

        // 재직 중인 모든 사용자 조회
        List<User> activeUsers = userRepository.findByEmpStatus("재직");

        int processedCount = 0;
        int errorCount = 0;

        for (User user : activeUsers) {
            try {
                calculateAndSaveVacationBalance(user.getIdx(), year);
                processedCount++;
            } catch (Exception e) {
                log.error("연차 계산 실패 - userIdx: {}, empId: {}, error: {}",
                        user.getIdx(), user.getEmpId(), e.getMessage(), e);
                errorCount++;
            }
        }

        log.info("전체 사용자 연차 계산 완료 - year: {}, total: {}, success: {}, error: {}",
                year, activeUsers.size(), processedCount, errorCount);

        return processedCount;
    }
}
