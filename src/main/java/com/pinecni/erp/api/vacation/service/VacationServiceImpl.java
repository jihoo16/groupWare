package com.pinecni.erp.api.vacation.service;

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

        // DTO 생성
        return VacationUserInfoDTO.builder()
                .userIdx(user.getIdx())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empPosition(user.getEmpPosition())
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
