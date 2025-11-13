package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.*;
import com.pinecni.erp.api.project.mapper.ProjectMapper;
import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import com.pinecni.erp.api.project.repository.ProjectRelationRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ResearchCardRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectMember;
import com.pinecni.erp.entity.ProjectRelation;
import com.pinecni.erp.entity.ResearchCard;
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
    private final ProjectMemberRepository projectMemberRepository;
    private final ResearchCardRepository researchCardRepository;
    private final ProjectRelationRepository projectRelationRepository;
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

        // 프로젝트 저장
        Project savedProject = projectRepository.save(project);
        // 연계 프로젝트
        if (createDTO.getProjectRelations() != null && !createDTO.getProjectRelations().isEmpty()) {
            log.debug("Saving {} relations for project idx={}", createDTO.getProjectRelations().size(), savedProject.getIdx());

            for(ProjectRelationsCreateDTO relationsDTO : createDTO.getProjectRelations()) {
                ProjectRelation relation = ProjectRelation.builder()
                        .sourceProjectIdx(savedProject.getIdx())
                        .targetProjectIdx(relationsDTO.getTargetProjectIdx())
                        .relationType(relationsDTO.getRelationType())
                        .description(relationsDTO.getDescription())
                        .createdUserIdx(createdUserIdx)
                        .build();

                projectRelationRepository.save(relation);
                log.debug("Project relation saved: source={}, target={}, type={}",
                         savedProject.getIdx(), relationsDTO.getTargetProjectIdx(), relationsDTO.getRelationType());
            }
        }
        // 연구비 카드 저장
        if (createDTO.getProjectCards() != null && !createDTO.getProjectCards().isEmpty()) {
            log.debug("Saving {} research cards for project idx={}", createDTO.getProjectCards().size(), savedProject.getIdx());

            for (ProjectCardCreateDTO cardDTO : createDTO.getProjectCards()) {
                // 카드 뒷 4자리 검증
                if (cardDTO.getCardLastDigits() == null || !cardDTO.getCardLastDigits().matches("\\d{4}")) {
                    log.warn("Invalid card last digits: {}. Skipping card for project idx={}",
                             cardDTO.getCardLastDigits(), savedProject.getIdx());
                    continue;
                }

                ResearchCard card = ResearchCard.builder()
                        .projectIdx(savedProject.getIdx())
                        .cardCompany(cardDTO.getCardCompany())
                        .cardLastDigits(cardDTO.getCardLastDigits())
                        .cardNickname(cardDTO.getCardNickname())
                        .isActive(true)
                        .build();

                researchCardRepository.save(card);
                log.debug("Research card saved: company={}, lastDigits={}, projectIdx={}",
                         cardDTO.getCardCompany(), cardDTO.getCardLastDigits(), savedProject.getIdx());
            }
        }

        // 팀원 저장 로직
        if (createDTO.getTeamMembers() != null && !createDTO.getTeamMembers().isEmpty()) {
            log.debug("Saving {} team members for project idx={}", createDTO.getTeamMembers().size(), savedProject.getIdx());

            for (ProjectMemberCreateDTO memberDTO : createDTO.getTeamMembers()) {
                ProjectMember member = ProjectMember.builder()
                        .projectIdx(savedProject.getIdx())
                        .employeeIdx(memberDTO.getEmployeeIdx())
                        .participationStartDate(memberDTO.getParticipationStartDate())
                        .participationEndDate(memberDTO.getParticipationEndDate())
                        .role(memberDTO.getRole())
                        .isActive(true)
                        .build();

                projectMemberRepository.save(member);
                log.debug("Team member saved: employeeIdx={}, projectIdx={}", memberDTO.getEmployeeIdx(), savedProject.getIdx());
            }
        }

        log.info("Project created: idx={}, name={}, teamMembers={}, researchCards={}",
                 savedProject.getIdx(),
                 savedProject.getProjectName(),
                 createDTO.getTeamMembers() != null ? createDTO.getTeamMembers().size() : 0,
                 createDTO.getProjectCards() != null ? createDTO.getProjectCards().size() : 0);
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
