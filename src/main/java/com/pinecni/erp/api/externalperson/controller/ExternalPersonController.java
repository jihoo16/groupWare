package com.pinecni.erp.api.externalperson.controller;

import com.pinecni.erp.api.externalperson.service.ExternalPersonService;
import com.pinecni.erp.entity.ExternalPerson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ExternalPerson Controller
 * 외부인원 관리 REST API
 */
@RestController
@RequestMapping("/api/external-persons")
@RequiredArgsConstructor
@Slf4j
public class ExternalPersonController {

    private final ExternalPersonService externalPersonService;

    /**
     * 전체 외부인원 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<ExternalPerson>> getAllExternalPersons() {
        log.debug("외부인원 목록 조회 요청");
        List<ExternalPerson> persons = externalPersonService.getAllExternalPersons();
        return ResponseEntity.ok(persons);
    }

    /**
     * 외부인원 단건 조회
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ExternalPerson> getExternalPersonById(@PathVariable Long idx) {
        log.debug("외부인원 상세 조회 요청: idx={}", idx);

        return externalPersonService.getExternalPersonById(idx)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 외부인원 등록
     */
    @PostMapping
    public ResponseEntity<ExternalPerson> createExternalPerson(
            @RequestBody ExternalPerson externalPerson,
            jakarta.servlet.http.HttpSession session) {
        log.info("외부인원 등록 요청: companyName={}, position={}, name={}",
                externalPerson.getCompanyName(), externalPerson.getPosition(), externalPerson.getName());

        // 세션에서 현재 로그인한 사용자 정보 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ExternalPerson createdPerson = externalPersonService.createExternalPerson(externalPerson, currentUserIdx);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdPerson);
        } catch (Exception e) {
            log.error("외부인원 등록 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 외부인원 수정
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ExternalPerson> updateExternalPerson(
            @PathVariable Long idx,
            @RequestBody ExternalPerson externalPerson,
            jakarta.servlet.http.HttpSession session) {
        log.info("외부인원 수정 요청: idx={}", idx);

        // 세션에서 현재 로그인한 사용자 정보 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.error("로그인 정보가 없습니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            ExternalPerson updatedPerson = externalPersonService.updateExternalPerson(idx, externalPerson, currentUserIdx);
            return ResponseEntity.ok(updatedPerson);
        } catch (RuntimeException e) {
            log.error("외부인원 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 외부인원 삭제
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Void> deleteExternalPerson(@PathVariable Long idx) {
        log.info("외부인원 삭제 요청: idx={}", idx);

        try {
            externalPersonService.deleteExternalPerson(idx);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("외부인원 삭제 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 회사명으로 검색
     */
    @GetMapping("/search/company")
    public ResponseEntity<List<ExternalPerson>> searchByCompanyName(@RequestParam String companyName) {
        log.debug("회사명 검색 요청: companyName={}", companyName);
        List<ExternalPerson> persons = externalPersonService.searchByCompanyName(companyName);
        return ResponseEntity.ok(persons);
    }

    /**
     * 이름으로 검색
     */
    @GetMapping("/search/name")
    public ResponseEntity<List<ExternalPerson>> searchByName(@RequestParam String name) {
        log.debug("이름 검색 요청: name={}", name);
        List<ExternalPerson> persons = externalPersonService.searchByName(name);
        return ResponseEntity.ok(persons);
    }
}
