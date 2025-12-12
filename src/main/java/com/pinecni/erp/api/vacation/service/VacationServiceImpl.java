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
import java.time.format.DateTimeFormatter;

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
}
