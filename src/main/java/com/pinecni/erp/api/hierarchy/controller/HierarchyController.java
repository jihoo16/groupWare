package com.pinecni.erp.api.hierarchy.controller;

import com.pinecni.erp.api.hierarchy.dto.HierarchyEmployeeDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyHistoryDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyStatsDTO;
import com.pinecni.erp.api.hierarchy.service.HierarchyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 보고체계 관리 Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/hierarchy")
@RequiredArgsConstructor
public class HierarchyController {

    private final HierarchyService hierarchyService;

    /**
     * 전체 직원 보고체계 정보 조회
     */
    @GetMapping("/employees")
    public ResponseEntity<List<HierarchyEmployeeDTO>> getAllEmployeesHierarchy() {
        log.debug("전체 직원 보고체계 정보 조회 요청");
        List<HierarchyEmployeeDTO> employees = hierarchyService.getAllEmployeesHierarchy();
        return ResponseEntity.ok(employees);
    }

    /**
     * 보고체계 통계 조회
     */
    @GetMapping("/stats")
    public ResponseEntity<HierarchyStatsDTO> getHierarchyStats() {
        log.debug("보고체계 통계 조회 요청");
        HierarchyStatsDTO stats = hierarchyService.getHierarchyStats();
        return ResponseEntity.ok(stats);
    }

    /**
     * 직원 보고체계 변경 이력 조회
     */
    @GetMapping("/history/{empIdx}")
    public ResponseEntity<List<HierarchyHistoryDTO>> getEmployeeHierarchyHistory(@PathVariable Long empIdx) {
        log.debug("직원 보고체계 변경 이력 조회 요청 - empIdx: {}", empIdx);
        List<HierarchyHistoryDTO> history = hierarchyService.getEmployeeHierarchyHistory(empIdx);
        return ResponseEntity.ok(history);
    }
}
