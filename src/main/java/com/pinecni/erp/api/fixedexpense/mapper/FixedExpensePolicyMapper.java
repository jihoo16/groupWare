package com.pinecni.erp.api.fixedexpense.mapper;

import com.pinecni.erp.api.fixedexpense.dto.FixedExpensePolicyDTO;
import com.pinecni.erp.api.fixedexpense.dto.FixedExpensePolicyUpdateDTO;
import com.pinecni.erp.entity.FixedExpensePolicy;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * FixedExpensePolicy Entity ↔ DTO 변환 Mapper
 */
@Component
public class FixedExpensePolicyMapper {

    /**
     * Entity → DTO 변환
     */
    public FixedExpensePolicyDTO toDTO(FixedExpensePolicy entity) {
        if (entity == null) {
            return null;
        }

        return FixedExpensePolicyDTO.builder()
                .idx(entity.getIdx())
                .positionCode(entity.getPositionCode())
                .positionName(entity.getPositionCodeRef() != null ? entity.getPositionCodeRef().getCodeName() : null)
                .lunchAllowance(entity.getLunchAllowance())
                .nightMealAllowance(entity.getNightMealAllowance())
                .businessMealAllowance(entity.getBusinessMealAllowance())
                .businessTripAllowance(entity.getBusinessTripAllowance())
                .transitAllowance(entity.getTransitAllowance())
                .fuelAllowance(entity.getFuelAllowance())
                .holidayExpense(entity.getHolidayExpense())
                .beverageExpense(entity.getBeverageExpense())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .build();
    }

    /**
     * UpdateDTO → Entity 변환 (새로 생성)
     */
    public FixedExpensePolicy toEntity(FixedExpensePolicyUpdateDTO dto, Long createdUserIdx) {
        if (dto == null) {
            return null;
        }

        return FixedExpensePolicy.builder()
                .positionCode(dto.getPositionCode())
                .lunchAllowance(dto.getLunchAllowance() != null ? dto.getLunchAllowance() : 0)
                .nightMealAllowance(dto.getNightMealAllowance() != null ? dto.getNightMealAllowance() : 0)
                .businessMealAllowance(dto.getBusinessMealAllowance() != null ? dto.getBusinessMealAllowance() : 0)
                .businessTripAllowance(dto.getBusinessTripAllowance() != null ? dto.getBusinessTripAllowance() : 0)
                .transitAllowance(dto.getTransitAllowance() != null ? dto.getTransitAllowance() : 0)
                .fuelAllowance(dto.getFuelAllowance() != null ? dto.getFuelAllowance() : 0)
                .holidayExpense(dto.getHolidayExpense() != null ? dto.getHolidayExpense() : 0)
                .beverageExpense(dto.getBeverageExpense() != null ? dto.getBeverageExpense() : 0)
                .build();
    }

    /**
     * UpdateDTO로 기존 Entity 업데이트
     */
    public void updateEntity(FixedExpensePolicy entity, FixedExpensePolicyUpdateDTO dto, Long updatedUserIdx) {
        if (entity == null || dto == null) {
            return;
        }

        // positionCode는 변경 불가 (키값이므로)

        if (dto.getLunchAllowance() != null) {
            entity.setLunchAllowance(dto.getLunchAllowance());
        }
        if (dto.getNightMealAllowance() != null) {
            entity.setNightMealAllowance(dto.getNightMealAllowance());
        }
        if (dto.getBusinessMealAllowance() != null) {
            entity.setBusinessMealAllowance(dto.getBusinessMealAllowance());
        }
        if (dto.getBusinessTripAllowance() != null) {
            entity.setBusinessTripAllowance(dto.getBusinessTripAllowance());
        }
        if (dto.getTransitAllowance() != null) {
            entity.setTransitAllowance(dto.getTransitAllowance());
        }
        if (dto.getFuelAllowance() != null) {
            entity.setFuelAllowance(dto.getFuelAllowance());
        }
        if (dto.getHolidayExpense() != null) {
            entity.setHolidayExpense(dto.getHolidayExpense());
        }
        if (dto.getBeverageExpense() != null) {
            entity.setBeverageExpense(dto.getBeverageExpense());
        }

        // 수정자 정보 업데이트
        entity.setUpdatedUserIdx(updatedUserIdx);
        entity.setUpdatedAt(LocalDateTime.now());
    }
}
