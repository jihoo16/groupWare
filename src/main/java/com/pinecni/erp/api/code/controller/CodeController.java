package com.pinecni.erp.api.code.controller;

import com.pinecni.erp.api.code.service.CodeService;
import com.pinecni.erp.entity.Code;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Code Controller
 * 직급(C02), 직위(C08) 등 코드 관리 REST API
 */
@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
@Slf4j
public class CodeController {

    private final CodeService codeService;

    /**
     * 그룹별 코드 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<Code>> getCodesByGroupCode(
            @RequestParam String groupCode,
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        log.debug("코드 목록 조회 요청: groupCode={}, activeOnly={}", groupCode, activeOnly);

        List<Code> codes = activeOnly
                ? codeService.getActiveCodesByGroupCode(groupCode)
                : codeService.getCodesByGroupCode(groupCode);

        return ResponseEntity.ok(codes);
    }

    /**
     * 코드 상세 조회
     */
    @GetMapping("/{idx}")
    public ResponseEntity<Code> getCodeById(@PathVariable Long idx) {
        log.debug("코드 상세 조회 요청: idx={}", idx);

        return codeService.getCodeById(idx)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 코드 생성
     */
    @PostMapping
    public ResponseEntity<Code> createCode(@RequestBody Code code) {
        log.info("코드 생성 요청: groupCode={}, code={}, codeName={}",
                code.getGroupCode(), code.getCode(), code.getCodeName());

        try {
            Code createdCode = codeService.createCode(code);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdCode);
        } catch (IllegalArgumentException e) {
            log.error("코드 생성 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 코드 수정
     */
    @PutMapping("/{idx}")
    public ResponseEntity<Code> updateCode(@PathVariable Long idx, @RequestBody Code code) {
        log.info("코드 수정 요청: idx={}", idx);

        try {
            Code updatedCode = codeService.updateCode(idx, code);
            return ResponseEntity.ok(updatedCode);
        } catch (IllegalArgumentException e) {
            log.error("코드 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 코드 삭제
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Void> deleteCode(@PathVariable Long idx) {
        log.info("코드 삭제 요청: idx={}", idx);

        try {
            codeService.deleteCode(idx);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("코드 삭제 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 코드 사용 여부 변경
     */
    @PatchMapping("/{idx}/toggle")
    public ResponseEntity<Code> toggleCodeUseYn(@PathVariable Long idx) {
        log.info("코드 사용 여부 변경 요청: idx={}", idx);

        try {
            Code updatedCode = codeService.toggleCodeUseYn(idx);
            return ResponseEntity.ok(updatedCode);
        } catch (IllegalArgumentException e) {
            log.error("코드 사용 여부 변경 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 직급 목록 조회 (C02)
     */
    @GetMapping("/ranks")
    public ResponseEntity<List<Code>> getRanks() {
        log.debug("직급 목록 조회 요청");
        return ResponseEntity.ok(codeService.getRanks());
    }

    /**
     * 직위 목록 조회 (C08)
     */
    @GetMapping("/positions")
    public ResponseEntity<List<Code>> getPositions() {
        log.debug("직위 목록 조회 요청");
        return ResponseEntity.ok(codeService.getPositions());
    }

    /**
     * 부서 목록 조회 (C01)
     */
    @GetMapping("/departments")
    public ResponseEntity<List<Code>> getDepartments(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        log.debug("부서 목록 조회 요청: activeOnly={}", activeOnly);
        List<Code> departments = activeOnly
                ? codeService.getActiveDepartments()
                : codeService.getDepartments();
        return ResponseEntity.ok(departments);
    }
}
