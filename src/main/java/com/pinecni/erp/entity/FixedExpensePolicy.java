package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

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

    @Column(name = "expense_item_name", nullable = false, length = 100)
    private String expenseItemName;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_code", referencedColumnName = "code", insertable = false, updatable = false)
    private Code positionCodeRef;

    @Size(max = 100)
    @Column(name = "expense_item_name_en", length = 100)
    private String expenseItemNameEn;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "amount", nullable = false)
    private Integer amount;

}
