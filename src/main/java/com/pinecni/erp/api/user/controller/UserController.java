package com.pinecni.erp.api.user.controller;

import com.pinecni.erp.api.user.dto.UserCreateDTO;
import com.pinecni.erp.api.user.dto.UserDTO;
import com.pinecni.erp.api.user.dto.UserSimpleDTO;
import com.pinecni.erp.api.user.dto.UserUpdateDTO;
import com.pinecni.erp.api.user.service.UserService;
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
            @RequestHeader(value = "X-User-Idx", required = false, defaultValue = "1") Long createdUserIdx) {
        log.debug("POST /api/users - createUser() with empId: {}", createDTO.getEmpId());
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
            @RequestHeader(value = "X-User-Idx", required = false, defaultValue = "1") Long updatedUserIdx) {
        log.debug("PUT /api/users/{} - updateUser()", idx);
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
            @RequestHeader(value = "X-User-Idx", required = false, defaultValue = "1") Long deletedUserIdx) {
        log.debug("DELETE /api/users/{} - deleteUser()", idx);
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
