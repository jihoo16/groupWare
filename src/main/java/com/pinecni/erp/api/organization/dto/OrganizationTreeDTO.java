package com.pinecni.erp.api.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 조직도 트리 구조 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationTreeDTO {

    /**
     * 부서 목록
     */
    private List<DepartmentNodeDTO> departments;
}
