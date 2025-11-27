package com.pinecni.erp.api.organization.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.organization.dto.*;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 조직도 서비스 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationServiceImpl implements OrganizationService {

    private final CodeRepository codeRepository;
    private final UserRepository userRepository;

    // 부서 그룹 코드
    private static final String DEPT_GROUP_CODE = "C01";
    // 직급 그룹 코드
    private static final String POSITION_GROUP_CODE = "C02";

    // 직급 순서 정의 (높은 직급 순서)
    private static final Map<String, Integer> POSITION_ORDER = new HashMap<>();
    static {
        POSITION_ORDER.put("대표이사", 1);
        POSITION_ORDER.put("전무", 2);
        POSITION_ORDER.put("상무", 3);
        POSITION_ORDER.put("이사", 4);
        POSITION_ORDER.put("부장", 5);
        POSITION_ORDER.put("차장", 6);
        POSITION_ORDER.put("과장", 7);
        POSITION_ORDER.put("대리", 8);
        POSITION_ORDER.put("주임", 9);
        POSITION_ORDER.put("사원", 10);
    }

    // 직급 그룹 정의
    private static final Map<String, String> POSITION_GROUPS = new HashMap<>();
    static {
        POSITION_GROUPS.put("대표이사", "C-Level");
        POSITION_GROUPS.put("전무", "C-Level");
        POSITION_GROUPS.put("상무", "C-Level");
        POSITION_GROUPS.put("이사", "C-Level");
        POSITION_GROUPS.put("부장", "Team Lead");
        POSITION_GROUPS.put("차장", "Team Lead");
        POSITION_GROUPS.put("과장", "Team Lead");
        POSITION_GROUPS.put("대리", "Team Member");
        POSITION_GROUPS.put("주임", "Team Member");
        POSITION_GROUPS.put("사원", "Team Member");
    }

    @Override
    public OrganizationTreeDTO getOrganizationTree() {
        log.info("getOrganizationTree() called");

        try {
            // 1. 부서 코드 목록 조회 (code 테이블에서 C01 그룹)
            List<Code> departmentCodes = codeRepository.findActiveByGroupCode(DEPT_GROUP_CODE);
            log.info("Found {} active department codes from code table (group: {})", departmentCodes.size(), DEPT_GROUP_CODE);

            if (!departmentCodes.isEmpty()) {
                departmentCodes.forEach(d -> log.debug("Department Code: {} - {} (sort: {})",
                    d.getCode(), d.getCodeName(), d.getSortOrder()));
            }

            // 2. 직급 코드 목록 조회 및 Map 생성 (코드값 -> 코드명)
            List<Code> positionCodes = codeRepository.findActiveByGroupCode(POSITION_GROUP_CODE);
            Map<String, String> positionCodeMap = positionCodes.stream()
                    .collect(Collectors.toMap(Code::getCode, Code::getCodeName));
            log.info("Found {} active position codes from code table (group: {})", positionCodes.size(), POSITION_GROUP_CODE);

            // 3. 활성화된 직원 목록 조회
            List<User> users = userRepository.findAllActive();
            log.info("Found {} active users", users.size());

            if (!users.isEmpty()) {
                users.forEach(u -> log.debug("User: {} (dept: {}, position: {})",
                    u.getEmpName(), u.getEmpDept(), u.getEmpPosition()));
            }

            // 4. 부서별로 직원 그룹화
            Map<String, List<User>> usersByDept = users.stream()
                    .collect(Collectors.groupingBy(User::getEmpDept));

            log.info("Users grouped by {} departments", usersByDept.size());

            // 5. 조직도 트리 구조 생성 (Repository에서 이미 sort_order로 정렬됨)
            List<DepartmentNodeDTO> departmentNodes = departmentCodes.stream()
                    .map(deptCode -> {
                        List<User> deptUsers = usersByDept.getOrDefault(deptCode.getCode(), Collections.emptyList());
                        log.debug("Creating node for dept code {} ({}) with {} users",
                            deptCode.getCode(), deptCode.getCodeName(), deptUsers.size());
                        return createDepartmentNode(deptCode, deptUsers, positionCodeMap);
                    })
                    .filter(node -> !node.getPositions().isEmpty()) // 직원이 있는 부서만 포함
                    .collect(Collectors.toList());

            log.info("Created {} department nodes", departmentNodes.size());

            OrganizationTreeDTO result = OrganizationTreeDTO.builder()
                    .departments(departmentNodes)
                    .build();

            log.info("Returning organization tree with {} departments", result.getDepartments().size());
            return result;

        } catch (Exception e) {
            log.error("Error building organization tree", e);
            return OrganizationTreeDTO.builder()
                    .departments(Collections.emptyList())
                    .build();
        }
    }

    /**
     * 부서 노드 생성
     */
    private DepartmentNodeDTO createDepartmentNode(Code deptCode, List<User> deptUsers, Map<String, String> positionCodeMap) {
        // 직급별로 직원 그룹화 (코드명 기준)
        Map<String, List<User>> usersByPosition = deptUsers.stream()
                .sorted(Comparator.comparing(u -> getPositionOrder(getPositionName(u.getEmpPosition(), positionCodeMap))))
                .collect(Collectors.groupingBy(
                        u -> getPositionGroupName(getPositionName(u.getEmpPosition(), positionCodeMap)),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        // 직급 그룹 생성
        List<PositionGroupDTO> positionGroups = new ArrayList<>();
        int groupId = (int) (deptCode.getIdx() * 100);

        for (Map.Entry<String, List<User>> entry : usersByPosition.entrySet()) {
            String groupName = entry.getKey();
            List<User> groupUsers = entry.getValue();

            if (!groupUsers.isEmpty()) {
                String rankRange = getRankRange(groupUsers, positionCodeMap);
                List<EmployeeNodeDTO> members = groupUsers.stream()
                        .map(user -> createEmployeeNode(user, deptCode.getCodeName(), positionCodeMap))
                        .collect(Collectors.toList());

                positionGroups.add(PositionGroupDTO.builder()
                        .id((long) groupId++)
                        .name(groupName)
                        .rank(rankRange)
                        .members(members)
                        .build());
            }
        }

        return DepartmentNodeDTO.builder()
                .id(deptCode.getIdx())
                .name(deptCode.getCodeName())
                .deptCode(deptCode.getCode())
                .positions(positionGroups)
                .build();
    }

    /**
     * 직원 노드 생성
     */
    private EmployeeNodeDTO createEmployeeNode(User user, String deptName, Map<String, String> positionCodeMap) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        String positionName = getPositionName(user.getEmpPosition(), positionCodeMap);

        return EmployeeNodeDTO.builder()
                .id(user.getIdx())
                .name(user.getEmpName())
                .position(positionName)
                .rank(positionName)
                .department(deptName)
                .email(user.getEmpEmail())
                .phone(user.getEmpPhone())
                .extension(user.getEmpId()) // 사번을 내선번호로 사용 (추후 수정 가능)
                .joinDate(user.getEmpJoinDate() != null ? user.getEmpJoinDate().format(formatter) : null)
                .status(user.getEmpStatus())
                .manager("-") // 상위 보고자 정보는 추후 확장 가능
                .teamCount(0) // 하위 팀원 수는 추후 확장 가능
                .build();
    }

    /**
     * 직급 코드를 직급명으로 변환
     */
    private String getPositionName(String positionCode, Map<String, String> positionCodeMap) {
        // 코드맵에서 찾기, 없으면 원래 값 반환
        return positionCodeMap.getOrDefault(positionCode, positionCode);
    }

    /**
     * 직급 순서 반환
     */
    private int getPositionOrder(String position) {
        return POSITION_ORDER.getOrDefault(position, 999);
    }

    /**
     * 직급 그룹명 반환
     */
    private String getPositionGroupName(String position) {
        return POSITION_GROUPS.getOrDefault(position, "Team Member");
    }

    /**
     * 직급 범위 문자열 반환
     */
    private String getRankRange(List<User> users, Map<String, String> positionCodeMap) {
        if (users.isEmpty()) {
            return "";
        }

        Set<String> uniquePositions = users.stream()
                .map(u -> getPositionName(u.getEmpPosition(), positionCodeMap))
                .collect(Collectors.toSet());

        if (uniquePositions.size() == 1) {
            return uniquePositions.iterator().next();
        }

        // 여러 직급이 있는 경우 범위로 표시
        List<String> sortedPositions = uniquePositions.stream()
                .sorted(Comparator.comparing(this::getPositionOrder))
                .collect(Collectors.toList());

        if (sortedPositions.size() == 2) {
            return sortedPositions.get(0) + ", " + sortedPositions.get(1);
        } else {
            return sortedPositions.get(0) + "~" + sortedPositions.get(sortedPositions.size() - 1);
        }
    }
}
