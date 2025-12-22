package com.pinecni.erp.api.hierarchy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 보고체계 관리 - 직원 정보 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HierarchyEmployeeDTO {

    private Long idx;
    private String empId;
    private String empName;
    private String empDept;        // 부서 코드
    private String empDeptName;    // 부서 한글명
    private String empPosition;    // 직급 코드
    private String empPositionName; // 직급 한글명

    // 보고체계 정보
    private Integer organizationalLevel;
    private Boolean isTeamLeader;
    private Long managerIdx;
    private String managerName;
    private LocalDate managerStartDate;

    // 상태 (계산 필드)
    private String status; // "completed" or "incomplete"
}
