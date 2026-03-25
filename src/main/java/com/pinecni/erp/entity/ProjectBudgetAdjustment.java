package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * 예산 보정값 변경 이력 Entity (감사 로그용)
 * 잔액 계산에는 사용하지 않음 - 현재 유효값은 projects 테이블 참조
 */
@Entity
@Table(name = "project_budget_adjustments", schema = "erp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectBudgetAdjustment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_budget_adjustments_sequence")
    @SequenceGenerator(name = "project_budget_adjustments_sequence",
            sequenceName = "erp.project_budget_adjustments_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    /** 예산 구분: ACTIVITY / EQUIPMENT / MATERIAL */
    @Column(name = "budget_type", nullable = false, length = 20)
    private String budgetType;

    /** 해당 시점에 설정된 보정액 값 */
    @Column(name = "adjustment_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal adjustmentAmount;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
}
