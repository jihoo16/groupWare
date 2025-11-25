package com.pinecni.erp.api.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 부서 노드 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentNodeDTO {

    /**
     * 부서 ID
     */
    private Long id;

    /**
     * 부서명
     */
    private String name;

    /**
     * 부서 코드
     */
    private String deptCode;

    /**
     * 직급별 그룹 목록
     */
    private List<PositionGroupDTO> positions;
}
