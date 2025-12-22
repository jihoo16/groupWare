package com.pinecni.erp.api.hierarchy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 보고체계 변경 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HierarchyUpdateDTO {

    @NotNull(message = "직원 IDX는 필수입니다")
    private Long empIdx;

    private Long managerIdx;
    private Integer organizationalLevel;
    private Boolean isTeamLeader;
    private LocalDate managerStartDate;
    private String changeReason;
}
