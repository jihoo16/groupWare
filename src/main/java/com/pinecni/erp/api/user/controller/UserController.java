package com.pinecni.erp.api.user.controller;

import com.pinecni.erp.api.user.dto.UserCreateDTO;
import com.pinecni.erp.api.user.dto.UserDTO;
import com.pinecni.erp.api.user.dto.UserSimpleDTO;
import com.pinecni.erp.api.user.dto.UserUpdateDTO;
import com.pinecni.erp.api.user.service.UserService;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * User REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 현재 로그인한 사용자 정보 조회
     * GET /api/users/me
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(HttpSession session) {
        log.debug("GET /api/users/me - getCurrentUser()");

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserDTO user = userService.getUserById(currentUserIdx);
        return ResponseEntity.ok(user);
    }

    /**
     * 현재 로그인한 사용자 프로필 업데이트
     * PUT /api/users/me
     *
     * 최초 로그인 시: 모든 기본 정보 업데이트 가능 (생년월일, 성별, 주소, 비상연락처 등)
     * 일반 프로필 수정 시: 이름, 이메일, 연락처, 주소만 수정 가능
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUserProfile(
            @RequestBody UserUpdateDTO updateDTO,
            HttpSession session) {

        log.debug("PUT /api/users/me - updateCurrentUserProfile()");

        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
            Map<String, String> error = new HashMap<>();
            error.put("error", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }

        // 사용자 정보 조회 (최초 로그인 여부 확인용)
        UserDTO currentUser = userService.getUserById(currentUserIdx);
        boolean isFirstLogin = currentUser.getLastLoginDate() == null;

        UserUpdateDTO profileUpdateDTO = new UserUpdateDTO();

        if (isFirstLogin) {
            // 최초 로그인 시: 모든 기본 정보 업데이트 허용
            log.info("최초 로그인 프로필 설정 - userIdx: {}", currentUserIdx);
            profileUpdateDTO.setEmpName(updateDTO.getEmpName());
            profileUpdateDTO.setEmpEmail(updateDTO.getEmpEmail());
            profileUpdateDTO.setEmpPhone(updateDTO.getEmpPhone());
            profileUpdateDTO.setEmpBirth(updateDTO.getEmpBirth());
            profileUpdateDTO.setEmpGender(updateDTO.getEmpGender());
            profileUpdateDTO.setEmpAddress(updateDTO.getEmpAddress());
            profileUpdateDTO.setExternalEmail(updateDTO.getExternalEmail());
            profileUpdateDTO.setEmergencyContact(updateDTO.getEmergencyContact());
            profileUpdateDTO.setEmpDept(updateDTO.getEmpDept());
            profileUpdateDTO.setEmpPosition(updateDTO.getEmpPosition());
            profileUpdateDTO.setEmpJoinDate(updateDTO.getEmpJoinDate());
            profileUpdateDTO.setEmpStatus(updateDTO.getEmpStatus());
            profileUpdateDTO.setEmpWorkType(updateDTO.getEmpWorkType());
        } else {
            // 일반 프로필 수정: 제한된 필드만 업데이트 허용
            log.info("프로필 업데이트 요청 - userIdx: {}", currentUserIdx);
            profileUpdateDTO.setEmpName(updateDTO.getEmpName());
            profileUpdateDTO.setEmpEmail(updateDTO.getEmpEmail());
            profileUpdateDTO.setEmpPhone(updateDTO.getEmpPhone());
            profileUpdateDTO.setEmpAddress(updateDTO.getEmpAddress());
        }

        try {
            UserDTO updatedUser = userService.updateUser(currentUserIdx, profileUpdateDTO, currentUserIdx);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            log.warn("프로필 업데이트 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("프로필 업데이트 중 오류 발생", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "프로필 업데이트 중 오류가 발생했습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 전체 활성 사용자 목록 조회
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<List<UserSimpleDTO>> getAllActiveUsers() {
        log.debug("GET /api/users - getAllActiveUsers()");
        List<UserSimpleDTO> users = userService.getAllActiveUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * 전체 사용자 목록 조회 (삭제된 사용자 포함)
     * GET /api/users/all
     */
    @GetMapping("/all")
    public ResponseEntity<List<UserSimpleDTO>> getAllUsers() {
        log.debug("GET /api/users/all - getAllUsers()");
        List<UserSimpleDTO> users = userService.getAllUsers(); 
        return ResponseEntity.ok(users);
    }

    /**
     * 사용자 상세 조회 (idx)
     * GET /api/users/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long idx) {
        log.debug("GET /api/users/{} - getUserById()", idx);
        UserDTO user = userService.getUserById(idx);
        return ResponseEntity.ok(user);
    }

    /**
     * 사용자 조회 (사번)
     * GET /api/users/emp-id/{empId}
     */
    @GetMapping("/emp-id/{empId}")
    public ResponseEntity<UserDTO> getUserByEmpId(@PathVariable String empId) {
        log.debug("GET /api/users/emp-id/{} - getUserByEmpId()", empId);
        UserDTO user = userService.getUserByEmpId(empId);
        return ResponseEntity.ok(user);
    }

    /**
     * 사용자 조회 (이메일)
     * GET /api/users/email/{empEmail}
     */
    @GetMapping("/email/{empEmail}")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String empEmail) {
        log.debug("GET /api/users/email/{} - getUserByEmail()", empEmail);
        UserDTO user = userService.getUserByEmail(empEmail);
        return ResponseEntity.ok(user);
    }

    /**
     * 부서별 활성 사용자 조회
     * GET /api/users/dept/{empDept}
     */
    @GetMapping("/dept/{empDept}")
    public ResponseEntity<List<UserSimpleDTO>> getUsersByDept(@PathVariable String empDept) {
        log.debug("GET /api/users/dept/{} - getUsersByDept()", empDept);
        List<UserSimpleDTO> users = userService.getUsersByDept(empDept);
        return ResponseEntity.ok(users);
    }

    /**
     * 직급별 활성 사용자 조회
     * GET /api/users/position/{empPosition}
     */
    @GetMapping("/position/{empPosition}")
    public ResponseEntity<List<UserSimpleDTO>> getUsersByPosition(@PathVariable String empPosition) {
        log.debug("GET /api/users/position/{} - getUsersByPosition()", empPosition);
        List<UserSimpleDTO> users = userService.getUsersByPosition(empPosition);
        return ResponseEntity.ok(users);
    }

    /**
     * 고위 관리자급 사용자 조회 (대표이사/상무/이사)
     * GET /api/users/high-rank-managers
     * 프로젝트 연구책임자 선택 시 사용
     */
    @GetMapping("/high-rank-managers")
    public ResponseEntity<List<UserSimpleDTO>> getHighRankManagers() {
        log.debug("GET /api/users/high-rank-managers - getHighRankManagers()");
        List<UserSimpleDTO> managers = userService.getHighRankManagers();
        return ResponseEntity.ok(managers);
    }

    /**
     * 상태별 사용자 조회
     * GET /api/users/status/{empStatus}
     */
    @GetMapping("/status/{empStatus}")
    public ResponseEntity<List<UserSimpleDTO>> getUsersByStatus(@PathVariable String empStatus) {
        log.debug("GET /api/users/status/{} - getUsersByStatus()", empStatus);
        List<UserSimpleDTO> users = userService.getUsersByStatus(empStatus);
        return ResponseEntity.ok(users);
    }

    /**
     * 이름으로 사용자 검색
     * GET /api/users/search?name={name}
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserSimpleDTO>> searchUsersByName(@RequestParam String name) {
        log.debug("GET /api/users/search?name={} - searchUsersByName()", name);
        List<UserSimpleDTO> users = userService.searchUsersByName(name);
        return ResponseEntity.ok(users);
    }

    /**
     * 사용자 생성
     * POST /api/users
     */
    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @Valid @RequestBody UserCreateDTO createDTO,
            HttpSession session) {

        // 세션에서 현재 로그인한 사용자 IDX 조회
        Long createdUserIdx = (Long) session.getAttribute("userIdx");
        if (createdUserIdx == null) {
            log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(401).build();
        }

        log.info("========== POST /api/users - createUser() ==========");
        log.info("Request Body:");
        log.info("  - empId: {}", createDTO.getEmpId());
        log.info("  - empName: {}", createDTO.getEmpName());
        log.info("  - empBirth: {}", createDTO.getEmpBirth());
        log.info("  - empGender: {}", createDTO.getEmpGender());
        log.info("  - empEmail: {}", createDTO.getEmpEmail());
        log.info("  - externalEmail: {}", createDTO.getExternalEmail());
        log.info("  - empPhone: {}", createDTO.getEmpPhone());
        log.info("  - emergencyContact: {}", createDTO.getEmergencyContact());
        log.info("  - empAddress: {} (length: {})", createDTO.getEmpAddress(),
                createDTO.getEmpAddress() != null ? createDTO.getEmpAddress().length() : 0);
        log.info("  - empDept: {}", createDTO.getEmpDept());
        log.info("  - empPosition: {}", createDTO.getEmpPosition());
        log.info("  - empJoinDate: {}", createDTO.getEmpJoinDate());
        log.info("  - empStatus: {}", createDTO.getEmpStatus());
        log.info("  - empWorkType: {}", createDTO.getEmpWorkType());
        log.info("  - empNotes: {} (length: {})", createDTO.getEmpNotes(),
                createDTO.getEmpNotes() != null ? createDTO.getEmpNotes().length() : 0);
        log.info("  - password: [PROTECTED] (length: {})",
                createDTO.getPassword() != null ? createDTO.getPassword().length() : 0);
        log.info("  - createdUserIdx: {}", createdUserIdx);
        log.info("====================================================");

        UserDTO user = userService.createUser(createDTO, createdUserIdx);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    /**
     * 사용자 수정
     * PUT /api/users/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long idx,
            @Valid @RequestBody UserUpdateDTO updateDTO,
            HttpSession session) {

        // 세션에서 현재 로그인한 사용자 IDX 조회
        Long updatedUserIdx = (Long) session.getAttribute("userIdx");
        if (updatedUserIdx == null) {
            log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(401).build();
        }

        // 본인이 아닌 경우 관리자 권한 필요
        if (!idx.equals(updatedUserIdx)) {
            if (!AuthorizationUtil.isAdminOrHigher(session)) {
                log.warn("관리자가 아닌 사용자의 타인 정보 수정 시도: userIdx={}, targetIdx={}", updatedUserIdx, idx);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        log.debug("PUT /api/users/{} - updateUser(), updatedUserIdx: {}", idx, updatedUserIdx);
        UserDTO user = userService.updateUser(idx, updateDTO, updatedUserIdx);
        return ResponseEntity.ok(user);
    }

    /**
     * 사용자 삭제 (Soft Delete)
     * DELETE /api/users/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable Long idx,
            HttpSession session) {

        // 세션에서 현재 로그인한 사용자 IDX 조회
        Long deletedUserIdx = (Long) session.getAttribute("userIdx");
        if (deletedUserIdx == null) {
            log.error("세션에 userIdx가 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(401).build();
        }

        // 관리자 권한 필요
        if (!AuthorizationUtil.isAdminOrHigher(session)) {
            log.warn("관리자가 아닌 사용자의 사용자 삭제 시도: userIdx={}, targetIdx={}", deletedUserIdx, idx);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        log.debug("DELETE /api/users/{} - deleteUser(), deletedUserIdx: {}", idx, deletedUserIdx);
        userService.deleteUser(idx, deletedUserIdx);
        Map<String, String> response = new HashMap<>();
        response.put("message", "사용자가 삭제되었습니다.");
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자 복구
     * POST /api/users/{idx}/restore
     */
    @PostMapping("/{idx}/restore")
    public ResponseEntity<UserDTO> restoreUser(@PathVariable Long idx, HttpSession session) {
        // 관리자 권한 필요
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!AuthorizationUtil.isAdminOrHigher(session)) {
            log.warn("관리자가 아닌 사용자의 사용자 복구 시도: userIdx={}, targetIdx={}", currentUserIdx, idx);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        log.debug("POST /api/users/{}/restore - restoreUser()", idx);
        UserDTO user = userService.restoreUser(idx);
        return ResponseEntity.ok(user);
    }

    /**
     * 사번 중복 확인
     * GET /api/users/check/emp-id/{empId}
     */
    @GetMapping("/check/emp-id/{empId}")
    public ResponseEntity<Map<String, Boolean>> checkEmpIdDuplicate(@PathVariable String empId) {
        log.debug("GET /api/users/check/emp-id/{} - checkEmpIdDuplicate()", empId);
        boolean isDuplicate = userService.isEmpIdDuplicate(empId);
        Map<String, Boolean> response = new HashMap<>();
        response.put("isDuplicate", isDuplicate);
        return ResponseEntity.ok(response);
    }

    /**
     * 이메일 중복 확인
     * GET /api/users/check/email/{empEmail}
     */
    @GetMapping("/check/email/{empEmail}")
    public ResponseEntity<Map<String, Boolean>> checkEmailDuplicate(@PathVariable String empEmail) {
        log.debug("GET /api/users/check/email/{} - checkEmailDuplicate()", empEmail);
        boolean isDuplicate = userService.isEmailDuplicate(empEmail);
        Map<String, Boolean> response = new HashMap<>();
        response.put("isDuplicate", isDuplicate);
        return ResponseEntity.ok(response);
    }

    /**
     * 다음 사번 생성
     * GET /api/users/next-employee-id
     *
     * 형식: YYYYMMddnn (예: 2025120101)
     * - 오늘 날짜 기준으로 등록된 직원이 없으면 01부터 시작
     * - 같은 날짜에 이미 등록된 직원이 있으면 nn을 증가
     */
    @GetMapping("/next-employee-id")
    public ResponseEntity<Map<String, String>> getNextEmployeeId() {
        log.debug("GET /api/users/next-employee-id - getNextEmployeeId()");
        String nextEmpId = userService.generateNextEmployeeId();
        Map<String, String> response = new HashMap<>();
        response.put("empId", nextEmpId);
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자의 상위 보고자 체인 조회
     * GET /api/users/{idx}/manager-chain
     *
     * 결재선 구성에 활용 (본인 -> 상위보고자 -> 상위보고자의 상위보고자 -> ... -> 최상위)
     */
    @GetMapping("/{idx}/manager-chain")
    public ResponseEntity<List<UserSimpleDTO>> getManagerChain(@PathVariable Long idx) {
        log.debug("GET /api/users/{}/manager-chain - getManagerChain()", idx);
        List<UserSimpleDTO> managerChain = userService.getManagerChain(idx);
        return ResponseEntity.ok(managerChain);
    }

    /**
     * 같은 부서 내 상급자 목록 조회
     * GET /api/users/{idx}/senior-users
     *
     * 부서장 선택 드롭다운에 활용 (같은 부서 내에서 자신보다 직급이 높은 사용자만)
     */
    @GetMapping("/{idx}/senior-users")
    public ResponseEntity<List<UserSimpleDTO>> getSeniorUsersInDept(@PathVariable Long idx) {
        log.debug("GET /api/users/{}/senior-users - getSeniorUsersInDept()", idx);
        List<UserSimpleDTO> seniorUsers = userService.getSeniorUsersInDept(idx);
        return ResponseEntity.ok(seniorUsers);
    }

    /**
     * 소속 부서의 상무 조회 (결재라인 자동 설정용)
     * GET /api/users/{idx}/dept-director
     *
     * 전자문서 결재라인 자동 설정 시 부서장을 상무로 고정
     */
    @GetMapping("/{idx}/dept-director")
    public ResponseEntity<UserSimpleDTO> getDeptDirector(@PathVariable Long idx) {
        log.debug("GET /api/users/{}/dept-director - getDeptDirector()", idx);
        UserSimpleDTO director = userService.getDeptDirector(idx);
        if (director == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(director);
    }

    /**
     * 직속 상위보고자 단건 조회
     * GET /api/users/{idx}/direct-manager
     */
    @GetMapping("/{idx}/direct-manager")
    public ResponseEntity<UserSimpleDTO> getDirectManager(@PathVariable Long idx) {
        log.debug("GET /api/users/{}/direct-manager - getDirectManager()", idx);
        UserSimpleDTO manager = userService.getDirectManager(idx);
        if (manager == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(manager);
    }

    /**
     * 대표이사 조회 (결재라인 자동 설정용)
     * GET /api/users/ceo
     *
     * 전직원 공통 - 항상 isAdmin=true인 대표이사 반환
     */
    @GetMapping("/ceo")
    public ResponseEntity<UserSimpleDTO> getCeo() {
        log.debug("GET /api/users/ceo - getCeo()");
        UserSimpleDTO ceo = userService.getCeo();
        if (ceo == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ceo);
    }

    /**
     * Exception Handler
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("IllegalArgumentException: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalStateException(IllegalStateException e) {
        log.warn("IllegalStateException: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error occurred", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
