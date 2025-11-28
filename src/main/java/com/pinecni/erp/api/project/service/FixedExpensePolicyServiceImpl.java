package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.FixedExpensePolicyDTO;
import com.pinecni.erp.api.project.dto.FixedExpensePolicyUpdateDTO;
import com.pinecni.erp.api.project.mapper.FixedExpensePolicyMapper;
import com.pinecni.erp.entity.FixedExpensePolicy;
import com.pinecni.erp.api.project.repository.FixedExpensePolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 직급별 고정경비 정책 Service Implementation
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FixedExpensePolicyServiceImpl implements FixedExpensePolicyService {

    private final FixedExpensePolicyRepository fixedExpensePolicyRepository;
    private final FixedExpensePolicyMapper mapper;

    @Override
    public List<FixedExpensePolicyDTO> getAllPolicies() {
        log.debug("getAllPolicies() called");
        return fixedExpensePolicyRepository.findAllByOrderByPositionCodeAscExpenseItemNameAsc().stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public FixedExpensePolicyDTO getPolicyByPositionCode(String positionCode) {
        log.debug("getPolicyByPositionCode() called with positionCode: {}", positionCode);

        // 주의: 이 메서드는 한 직급에 여러 경비 항목이 있을 수 있으므로 첫 번째 항목만 반환
        List<FixedExpensePolicy> policies = fixedExpensePolicyRepository.findByPositionCode(positionCode);

        if (policies.isEmpty()) {
            return null;
        }

        return mapper.toDTO(policies.get(0));
    }

    @Override
    @Transactional
    public FixedExpensePolicyDTO upsertPolicy(FixedExpensePolicyUpdateDTO updateDTO, Long userIdx) {
        log.debug("upsertPolicy() called with positionCode: {}, expenseItemName: {}",
                updateDTO.getPositionCode(), updateDTO.getExpenseItemName());

        if (updateDTO.getPositionCode() == null || updateDTO.getPositionCode().isEmpty()) {
            throw new IllegalArgumentException("직급 코드는 필수입니다.");
        }

        if (updateDTO.getExpenseItemName() == null || updateDTO.getExpenseItemName().isEmpty()) {
            throw new IllegalArgumentException("경비 항목명은 필수입니다.");
        }

        Optional<FixedExpensePolicy> existingPolicy =
                fixedExpensePolicyRepository.findByPositionCodeAndExpenseItemName(
                        updateDTO.getPositionCode(), updateDTO.getExpenseItemName());

        FixedExpensePolicy policy;

        if (existingPolicy.isPresent()) {
            // 수정
            policy = existingPolicy.get();
            mapper.updateEntity(policy, updateDTO, userIdx);
            log.info("FixedExpensePolicy updated for positionCode: {}, expenseItemName: {}",
                    updateDTO.getPositionCode(), updateDTO.getExpenseItemName());
        } else {
            // 생성
            policy = mapper.toEntity(updateDTO, userIdx);
            policy.setCreatedAt(LocalDateTime.now());
            policy.setCreatedUserIdx(userIdx);
            policy.setUpdatedAt(LocalDateTime.now());
            policy.setUpdatedUserIdx(userIdx);
            log.info("FixedExpensePolicy created for positionCode: {}, expenseItemName: {}",
                    updateDTO.getPositionCode(), updateDTO.getExpenseItemName());
        }

        FixedExpensePolicy savedPolicy = fixedExpensePolicyRepository.save(policy);
        return mapper.toDTO(savedPolicy);
    }

    @Override
    @Transactional
    public List<FixedExpensePolicyDTO> upsertPolicies(List<FixedExpensePolicyUpdateDTO> updateDTOs, Long userIdx) {
        log.debug("upsertPolicies() called with {} policies", updateDTOs.size());

        return updateDTOs.stream()
                .map(dto -> upsertPolicy(dto, userIdx))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePolicy(String positionCode) {
        log.debug("deletePolicy() called with positionCode: {}", positionCode);

        List<FixedExpensePolicy> policies = fixedExpensePolicyRepository.findByPositionCode(positionCode);

        if (policies.isEmpty()) {
            throw new IllegalArgumentException("해당 직급의 고정경비 정책을 찾을 수 없습니다: " + positionCode);
        }

        fixedExpensePolicyRepository.deleteAll(policies);
        log.info("FixedExpensePolicy deleted for positionCode: {} ({} items)", positionCode, policies.size());
    }
}
