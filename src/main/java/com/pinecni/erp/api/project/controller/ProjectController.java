package com.pinecni.erp.api.project.controller;

import com.pinecni.erp.api.project.dto.ProjectCreateDTO;
import com.pinecni.erp.api.project.dto.ProjectDTO;
import com.pinecni.erp.api.project.dto.ProjectUpdateDTO;
import com.pinecni.erp.api.project.dto.ResearchCardDTO;
import com.pinecni.erp.api.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 프로젝트 REST API Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * 전체 프로젝트 목록 조회
     * GET /api/projects
     * GET /api/projects?status=IN_PROGRESS
     */
    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getAllProjects(
            @RequestParam(required = false) String status) {
        log.debug("GET /api/projects - status: {}", status);

        List<ProjectDTO> projects;
        if (status != null && !status.isEmpty()) {
            projects = projectService.getProjectsByStatus(status);
        } else {
            projects = projectService.getAllProjects();
        }

        return ResponseEntity.ok(projects);
    }

    /**
     * 프로젝트 상세 조회
     * GET /api/projects/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ProjectDTO> getProjectById(@PathVariable Long idx) {
        log.debug("GET /api/projects/{}", idx);

        try {
            ProjectDTO project = projectService.getProjectById(idx);
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            log.error("프로젝트 조회 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 과거 프로젝트 조회 (진행중이 아닌 프로젝트)
     * GET /api/projects/past
     * GET /api/projects/past?status=COMPLETED
     */
    @GetMapping("/past")
    public ResponseEntity<List<ProjectDTO>> getPastProjects(
            @RequestParam(required = false) String status) {
        log.debug("GET /api/projects/past - status: {}", status);

        List<ProjectDTO> projects;
        if (status != null && !status.isEmpty()) {
            projects = projectService.getPastProjectsByStatus(status);
        } else {
            projects = projectService.getPastProjects();
        }

        return ResponseEntity.ok(projects);
    }

    /**
     * 프로젝트 검색
     * GET /api/projects/search?name=xxx
     */
    @GetMapping("/search")
    public ResponseEntity<List<ProjectDTO>> searchProjects(
            @RequestParam String name) {
        log.debug("GET /api/projects/search - name: {}", name);

        List<ProjectDTO> projects = projectService.searchProjectsByName(name);
        return ResponseEntity.ok(projects);
    }

    /**
     * 프로젝트 생성
     * POST /api/projects
     */
    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(
            @RequestBody ProjectCreateDTO createDTO,
            jakarta.servlet.http.HttpSession session) {
        log.debug("POST /api/projects - projectName: {}", createDTO.getProjectName());

        // 세션에서 로그인한 사용자 IDX 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            currentUserIdx = 1L; // 기본값 (로그인 안된 경우)
        }

        log.debug("Created by userIdx: {}", currentUserIdx);

        try {
            ProjectDTO project = projectService.createProject(createDTO, currentUserIdx);
            return ResponseEntity.status(HttpStatus.CREATED).body(project);
        } catch (IllegalArgumentException e) {
            log.error("프로젝트 생성 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 프로젝트 수정
     * PUT /api/projects/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ProjectDTO> updateProject(
            @PathVariable Long idx,
            @RequestBody ProjectUpdateDTO updateDTO,
            jakarta.servlet.http.HttpSession session) {
        log.debug("PUT /api/projects/{}", idx);

        // 세션에서 로그인한 사용자 IDX 가져오기
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            currentUserIdx = 1L; // 기본값 (로그인 안된 경우)
        }

        log.debug("Updated by userIdx: {}", currentUserIdx);

        try {
            ProjectDTO project = projectService.updateProject(idx, updateDTO, currentUserIdx);
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            log.error("프로젝트 수정 실패: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 프로젝트 삭제
     * DELETE /api/projects/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteProject(@PathVariable Long idx) {
        log.debug("DELETE /api/projects/{}", idx);

        try {
            projectService.deleteProject(idx);

            Map<String, String> response = new HashMap<>();
            response.put("message", "프로젝트가 삭제되었습니다.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("프로젝트 삭제 실패: {}", e.getMessage());

            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * 프로젝트별 연구비 카드 목록 조회
     * GET /api/projects/{idx}/cards
     */
    @GetMapping("/{idx}/cards")
    public ResponseEntity<List<ResearchCardDTO>> getProjectCards(@PathVariable Long idx) {
        log.debug("GET /api/projects/{}/cards", idx);

        try {
            List<ResearchCardDTO> cards = projectService.getProjectCards(idx);
            return ResponseEntity.ok(cards);
        } catch (Exception e) {
            log.error("연구비 카드 조회 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 프로젝트 참여인원 조회
     * GET /api/projects/{idx}/members
     */
    @GetMapping("/{idx}/members")
    public ResponseEntity<?> getProjectMembers(@PathVariable Long idx) {
        log.debug("GET /api/projects/{}/members", idx);

        try {
            ProjectDTO project = projectService.getProjectById(idx);
            return ResponseEntity.ok(project.getProjectMembers());
        } catch (Exception e) {
            log.error("프로젝트 참여인원 조회 실패: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "프로젝트 참여인원을 조회할 수 없습니다.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Exception Handler
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error occurred", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
