package com.pinecni.erp.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 직급별 고정경비 정책 Entity
 */
@Entity
@Table(name = "fixed_expense_policy", schema = "erp")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FixedExpensePolicy extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "fixed_expense_policy_sequence")
    @SequenceGenerator(name = "fixed_expense_policy_sequence", sequenceName = "erp.fixed_expense_policy_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "position_code", nullable = false, length = 50)
    private String positionCode;

    @Column(name = "lunch_allowance")
    private Integer lunchAllowance;

    @Column(name = "night_meal_allowance")
    private Integer nightMealAllowance;

    @Column(name = "business_meal_allowance")
    private Integer businessMealAllowance;

    @Column(name = "business_trip_allowance")
    private Integer businessTripAllowance;

    @Column(name = "transit_allowance")
    private Integer transitAllowance;

    @Column(name = "fuel_allowance")
    private Integer fuelAllowance;

    @Column(name = "holiday_expense")
    private Integer holidayExpense;

    @Column(name = "beverage_expense")
    private Integer beverageExpense;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_code", referencedColumnName = "code", insertable = false, updatable = false)
    private Code positionCodeRef;
}
