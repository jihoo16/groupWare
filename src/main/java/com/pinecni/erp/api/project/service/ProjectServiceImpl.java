package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ProjectCreateDTO;
import com.pinecni.erp.api.project.dto.ProjectDTO;
import com.pinecni.erp.api.project.dto.ProjectUpdateDTO;
import com.pinecni.erp.api.project.mapper.ProjectMapper;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.entity.Project;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 프로젝트 Service Implementation
 * 실제 비즈니스 로직 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMapper mapper;

    @Override
    public List<ProjectDTO> getAllProjects() {
        log.debug("getAllProjects() called");

        return projectRepository.findAllActive().stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectDTO> getProjectsByStatus(String status) {
        log.debug("getProjectsByStatus() called with status: {}", status);

        return projectRepository.findByProjectStatus(status).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ProjectDTO getProjectById(Long idx) {
        log.debug("getProjectById() called with idx: {}", idx);

        Project project = projectRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다: " + idx));

        if (project.getIsDeleted()) {
            throw new IllegalArgumentException("삭제된 프로젝트입니다: " + idx);
        }

        return mapper.toDTO(project);
    }

    @Override
    @Transactional
    public ProjectDTO createProject(ProjectCreateDTO createDTO, Long createdUserIdx) {
        log.debug("createProject() called with projectName: {}", createDTO.getProjectName());

        // 필수값 검증
        if (createDTO.getProjectName() == null || createDTO.getProjectName().isEmpty()) {
            throw new IllegalArgumentException("프로젝트명은 필수입니다.");
        }
        if (createDTO.getStartDate() == null) {
            throw new IllegalArgumentException("시작일은 필수입니다.");
        }
        if (createDTO.getEndDate() == null) {
            throw new IllegalArgumentException("종료일은 필수입니다.");
        }
        if (createDTO.getStartDate().isAfter(createDTO.getEndDate())) {
            throw new IllegalArgumentException("시작일은 종료일보다 이전이어야 합니다.");
        }

        // DTO → Entity 변환
        Project project = mapper.toEntity(createDTO, createdUserIdx);

        // 저장
        Project savedProject = projectRepository.save(project);

        log.info("Project created: idx={}, name={}", savedProject.getIdx(), savedProject.getProjectName());
        return mapper.toDTO(savedProject);
    }

    @Override
    @Transactional
    public ProjectDTO updateProject(Long idx, ProjectUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateProject() called with idx: {}", idx);

        // 프로젝트 조회
        Project project = projectRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다: " + idx));

        if (project.getIsDeleted()) {
            throw new IllegalArgumentException("삭제된 프로젝트는 수정할 수 없습니다: " + idx);
        }

        // 날짜 검증
        if (updateDTO.getStartDate() != null && updateDTO.getEndDate() != null) {
            if (updateDTO.getStartDate().isAfter(updateDTO.getEndDate())) {
                throw new IllegalArgumentException("시작일은 종료일보다 이전이어야 합니다.");
            }
        }

        // Entity 업데이트
        mapper.updateEntity(project, updateDTO, updatedUserIdx);

        // 저장
        Project updatedProject = projectRepository.save(project);

        log.info("Project updated: idx={}, name={}", updatedProject.getIdx(), updatedProject.getProjectName());
        return mapper.toDTO(updatedProject);
    }

    @Override
    @Transactional
    public void deleteProject(Long idx) {
        log.debug("deleteProject() called with idx: {}", idx);

        // 프로젝트 조회
        Project project = projectRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다: " + idx));

        // 소프트 삭제
        project.setIsDeleted(true);
        projectRepository.save(project);

        log.info("Project deleted (soft): idx={}, name={}", project.getIdx(), project.getProjectName());
    }

    @Override
    public List<ProjectDTO> searchProjectsByName(String name) {
        log.debug("searchProjectsByName() called with name: {}", name);

        if (name == null || name.trim().isEmpty()) {
            return getAllProjects();
        }

        return projectRepository.searchByName(name.trim()).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }
}
