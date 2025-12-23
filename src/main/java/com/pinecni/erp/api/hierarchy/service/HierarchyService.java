package com.pinecni.erp.api.hierarchy.service;

import com.pinecni.erp.api.hierarchy.dto.HierarchyEmployeeDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyHistoryDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyStatsDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyUpdateDTO;

import java.util.List;

/**
 * 보고체계 관리 Service 인터페이스
 */
public interface HierarchyService {

    /**
     * 전체 직원 보고체계 정보 조회
     */
    List<HierarchyEmployeeDTO> getAllEmployeesHierarchy();

    /**
     * 보고체계 통계 조회
     */
    HierarchyStatsDTO getHierarchyStats();

    /**
     * 직원 보고체계 정보 업데이트
     */
    HierarchyEmployeeDTO updateEmployeeHierarchy(Long empIdx, HierarchyUpdateDTO updateDTO, Long currentUserIdx);

    /**
     * 직원 보고체계 변경 이력 조회
     */
    List<HierarchyHistoryDTO> getEmployeeHierarchyHistory(Long empIdx);

    /**
     * 일괄 보고체계 업데이트
     */
    void bulkUpdateHierarchy(List<HierarchyUpdateDTO> updateDTOs, Long currentUserIdx);
}
