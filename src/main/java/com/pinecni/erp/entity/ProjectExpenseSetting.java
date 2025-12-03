package com.pinecni.erp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

/**
 * 프로젝트별 직급별 경비 설정 Entity
 */
@Entity
@Table(name = "project_expense_settings", schema = "erp",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_idx", "position_code", "expense_item_name"}),
        indexes = {
                @Index(name = "idx_pes_project", columnList = "project_idx"),
                @Index(name = "idx_pes_position", columnList = "position_code")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectExpenseSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "project_expense_settings_sequence")
    @SequenceGenerator(name = "project_expense_settings_sequence", sequenceName = "erp.project_expense_settings_sequence", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "project_idx", nullable = false)
    private Long projectIdx;

    @Column(name = "position_code", nullable = false, length = 20)
    private String positionCode;

    @Column(name = "expense_item_name", nullable = false, length = 100)
    private String expenseItemName;

    @Size(max = 100)
    @Column(name = "expense_item_name_en", length = 100)
    private String expenseItemNameEn;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "amount", nullable = false)
    private Integer amount;

    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_idx", insertable = false, updatable = false)
    private Project project;
}
