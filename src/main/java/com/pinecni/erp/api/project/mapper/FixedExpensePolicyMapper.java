package com.pinecni.erp.api.project.mapper;

import com.pinecni.erp.api.project.dto.FixedExpensePolicyDTO;
import com.pinecni.erp.api.project.dto.FixedExpensePolicyUpdateDTO;
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
                .expenseItemName(entity.getExpenseItemName())
                .expenseItemNameEn(entity.getExpenseItemNameEn())
                .amount(entity.getAmount())
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
                .expenseItemName(dto.getExpenseItemName())
                .expenseItemNameEn(dto.getExpenseItemNameEn())
                .amount(dto.getAmount() != null ? dto.getAmount() : 0)
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

        if (dto.getExpenseItemName() != null) {
            entity.setExpenseItemName(dto.getExpenseItemName());
        }
        if (dto.getExpenseItemNameEn() != null) {
            entity.setExpenseItemNameEn(dto.getExpenseItemNameEn());
        }
        if (dto.getAmount() != null) {
            entity.setAmount(dto.getAmount());
        }

        // 수정자 정보 업데이트
        entity.setUpdatedUserIdx(updatedUserIdx);
        entity.setUpdatedAt(LocalDateTime.now());
    }
}
