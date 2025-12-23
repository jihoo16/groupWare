package com.pinecni.erp.api.user.controller;

import com.pinecni.erp.api.user.dto.UserCreateDTO;
import com.pinecni.erp.api.user.dto.UserDTO;
import com.pinecni.erp.api.user.dto.UserSimpleDTO;
import com.pinecni.erp.api.user.dto.UserUpdateDTO;
import com.pinecni.erp.api.user.service.UserService;
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
    public ResponseEntity<UserDTO> restoreUser(@PathVariable Long idx) {
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
