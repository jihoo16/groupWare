package com.pinecni.erp.api.hierarchy.controller;

import com.pinecni.erp.api.hierarchy.dto.HierarchyEmployeeDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyHistoryDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyStatsDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyUpdateDTO;
import com.pinecni.erp.api.hierarchy.service.HierarchyService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
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
     * 직원 보고체계 정보 업데이트
     */
    @PutMapping("/employees/{empIdx}")
    public ResponseEntity<HierarchyEmployeeDTO> updateEmployeeHierarchy(
            @PathVariable Long empIdx,
            @Valid @RequestBody HierarchyUpdateDTO updateDTO,
            HttpSession session) {
        log.debug("직원 보고체계 업데이트 요청 - empIdx: {}", empIdx);

        // 세션에서 현재 사용자 IDX 가져오기 (임시로 1L 사용)
        // TODO: 실제 세션에서 사용자 정보 가져오기
        Long currentUserIdx = 1L;

        HierarchyEmployeeDTO result = hierarchyService.updateEmployeeHierarchy(empIdx, updateDTO, currentUserIdx);
        return ResponseEntity.ok(result);
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

    /**
     * 일괄 보고체계 업데이트
     */
    @PostMapping("/bulk")
    public ResponseEntity<Void> bulkUpdateHierarchy(
            @Valid @RequestBody List<HierarchyUpdateDTO> updateDTOs,
            HttpSession session) {
        log.debug("일괄 보고체계 업데이트 요청 - 대상: {}명", updateDTOs.size());

        // 세션에서 현재 사용자 IDX 가져오기 (임시로 1L 사용)
        // TODO: 실제 세션에서 사용자 정보 가져오기
        Long currentUserIdx = 1L;

        hierarchyService.bulkUpdateHierarchy(updateDTOs, currentUserIdx);
        return ResponseEntity.ok().build();
    }
}
