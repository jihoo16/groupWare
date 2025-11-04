package com.pinecni.erp.api.project.controller;

import com.pinecni.erp.api.project.dto.ProjectCreateDTO;
import com.pinecni.erp.api.project.dto.ProjectDTO;
import com.pinecni.erp.api.project.dto.ProjectUpdateDTO;
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
            @RequestBody ProjectCreateDTO createDTO) {
        log.debug("POST /api/projects - projectName: {}", createDTO.getProjectName());

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

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
            @RequestBody ProjectUpdateDTO updateDTO) {
        log.debug("PUT /api/projects/{}", idx);

        // TODO: 실제 사용자 IDX를 세션이나 인증 정보에서 가져와야 함
        Long currentUserIdx = 1L;

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
