package com.pinecni.erp.api.code.controller;

import com.pinecni.erp.api.code.service.CodeGroupService;
import com.pinecni.erp.entity.CodeGroup;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * CodeGroup Controller
 * 그룹코드 관리 REST API
 */
@RestController
@RequestMapping("/api/code-groups")
@RequiredArgsConstructor
@Slf4j
public class CodeGroupController {

    private final CodeGroupService codeGroupService;

    /** 개발자 권한 검증 */
    private void requireDev(HttpSession session) {
        Boolean isDev = (Boolean) session.getAttribute("isDev");
        if (isDev == null || !isDev) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "개발자 권한이 필요합니다.");
        }
    }

    /**
     * 그룹코드 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<CodeGroup>> getCodeGroups(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        log.debug("그룹코드 목록 조회 요청: activeOnly={}", activeOnly);

        List<CodeGroup> codeGroups = activeOnly
                ? codeGroupService.getActiveCodeGroups()
                : codeGroupService.getAllCodeGroups();

        return ResponseEntity.ok(codeGroups);
    }

    /**
     * 그룹코드 상세 조회
     */
    @GetMapping("/{idx}")
    public ResponseEntity<CodeGroup> getCodeGroupById(@PathVariable Long idx) {
        log.debug("그룹코드 상세 조회 요청: idx={}", idx);

        return codeGroupService.getCodeGroupById(idx)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 그룹코드로 조회
     */
    @GetMapping("/code/{groupCode}")
    public ResponseEntity<CodeGroup> getCodeGroupByCode(@PathVariable String groupCode) {
        log.debug("그룹코드 조회 요청: groupCode={}", groupCode);

        return codeGroupService.getCodeGroupByCode(groupCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 그룹코드 생성
     */
    @PostMapping
    public ResponseEntity<CodeGroup> createCodeGroup(@RequestBody CodeGroup codeGroup, HttpSession session) {
        requireDev(session);
        log.info("그룹코드 생성 요청: groupCode={}, groupName={}",
                codeGroup.getGroupCode(), codeGroup.getGroupName());

        try {
            CodeGroup createdCodeGroup = codeGroupService.createCodeGroup(codeGroup);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdCodeGroup);
        } catch (IllegalArgumentException e) {
            log.error("그룹코드 생성 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 그룹코드 수정
     */
    @PutMapping("/{idx}")
    public ResponseEntity<CodeGroup> updateCodeGroup(
            @PathVariable Long idx,
            @RequestBody CodeGroup codeGroup,
            HttpSession session) {
        requireDev(session);
        log.info("그룹코드 수정 요청: idx={}", idx);

        try {
            CodeGroup updatedCodeGroup = codeGroupService.updateCodeGroup(idx, codeGroup);
            return ResponseEntity.ok(updatedCodeGroup);
        } catch (IllegalArgumentException e) {
            log.error("그룹코드 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 그룹코드 삭제
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Void> deleteCodeGroup(@PathVariable Long idx, HttpSession session) {
        requireDev(session);
        log.info("그룹코드 삭제 요청: idx={}", idx);

        try {
            codeGroupService.deleteCodeGroup(idx);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("그룹코드 삭제 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 그룹코드 사용 여부 변경
     */
    @PatchMapping("/{idx}/toggle")
    public ResponseEntity<CodeGroup> toggleCodeGroupUseYn(@PathVariable Long idx, HttpSession session) {
        requireDev(session);
        log.info("그룹코드 사용 여부 변경 요청: idx={}", idx);

        try {
            CodeGroup updatedCodeGroup = codeGroupService.toggleCodeGroupUseYn(idx);
            return ResponseEntity.ok(updatedCodeGroup);
        } catch (IllegalArgumentException e) {
            log.error("그룹코드 사용 여부 변경 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 그룹코드 존재 여부 확인
     */
    @GetMapping("/exists/{groupCode}")
    public ResponseEntity<Boolean> existsByGroupCode(@PathVariable String groupCode) {
        log.debug("그룹코드 존재 여부 확인 요청: groupCode={}", groupCode);
        boolean exists = codeGroupService.existsByGroupCode(groupCode);
        return ResponseEntity.ok(exists);
    }

    /**
     * 그룹코드 유효성 검증
     */
    @GetMapping("/validate/{groupCode}")
    public ResponseEntity<Boolean> isGroupCodeValid(@PathVariable String groupCode) {
        log.debug("그룹코드 유효성 검증 요청: groupCode={}", groupCode);
        boolean isValid = codeGroupService.isGroupCodeValid(groupCode);
        return ResponseEntity.ok(isValid);
    }
}
