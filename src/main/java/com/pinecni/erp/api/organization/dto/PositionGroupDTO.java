package com.pinecni.erp.api.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 직급 그룹 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionGroupDTO {

    /**
     * 그룹 ID (고유값)
     */
    private Long id;

    /**
     * 그룹명 (예: "본부장", "팀장", "팀원")
     */
    private String name;

    /**
     * 직급 정보 (예: "임원", "부장", "사원~차장")
     */
    private String rank;

    /**
     * 해당 그룹의 직원 목록
     */
    private List<EmployeeNodeDTO> members;
}
