package com.pinecni.erp.api.organization.controller;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.organization.dto.OrganizationTreeDTO;
import com.pinecni.erp.api.organization.service.OrganizationService;
import com.pinecni.erp.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 조직도 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/organization")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;
    private final CodeRepository codeRepository;
    private final UserRepository userRepository;

    private static final String DEPT_GROUP_CODE = "C01";

    /**
     * 조직도 트리 데이터 조회
     *
     * @return 조직도 트리 구조
     */
    @GetMapping("/tree")
    public ResponseEntity<OrganizationTreeDTO> getOrganizationTree() {
        log.info("GET /api/organization/tree - Request received");

        try {
            OrganizationTreeDTO tree = organizationService.getOrganizationTree();
            log.info("GET /api/organization/tree - Returning {} departments",
                    tree.getDepartments() != null ? tree.getDepartments().size() : 0);
            return ResponseEntity.ok(tree);
        } catch (Exception e) {
            log.error("Error fetching organization tree", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * DB 데이터 확인용 테스트 엔드포인트
     */
    @GetMapping("/debug")
    public ResponseEntity<Map<String, Object>> debugData() {
        log.info("GET /api/organization/debug");

        Map<String, Object> result = new HashMap<>();

        try {
            long totalCodes = codeRepository.count();
            long userCount = userRepository.count();
            long activeDeptCodes = codeRepository.findActiveByGroupCode(DEPT_GROUP_CODE).size();
            long activeUserCount = userRepository.findAllActive().size();

            result.put("totalCodes", totalCodes);
            result.put("totalUsers", userCount);
            result.put("activeDepartmentCodes", activeDeptCodes);
            result.put("activeUsers", activeUserCount);
            result.put("deptGroupCode", DEPT_GROUP_CODE);
            result.put("status", "success");

            log.info("Debug data - Dept Codes ({}): {}/{}, Users: {}/{}",
                    DEPT_GROUP_CODE, activeDeptCodes, totalCodes, activeUserCount, userCount);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error in debug endpoint", e);
            result.put("status", "error");
            result.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(result);
        }
    }
}
