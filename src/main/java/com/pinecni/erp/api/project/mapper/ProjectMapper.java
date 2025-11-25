package com.pinecni.erp.api.project.mapper;

import com.pinecni.erp.api.project.dto.ProjectCreateDTO;
import com.pinecni.erp.api.project.dto.ProjectDTO;
import com.pinecni.erp.api.project.dto.ProjectRelationDTO;
import com.pinecni.erp.api.project.dto.ProjectUpdateDTO;
import com.pinecni.erp.api.project.repository.ProjectRelationRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectRelation;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Project Entity ↔ DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class ProjectMapper {

    private final ProjectRelationRepository projectRelationRepository;
    private final ProjectRepository projectRepository;

    /**
     * Entity → DTO 변환
     * 프로젝트 조회 시 사용
     */
    public ProjectDTO toDTO(Project entity) {
        if (entity == null) {
            return null;
        }

        // 연계 프로젝트 목록 조회 및 변환
        List<ProjectRelationDTO> relations = projectRelationRepository
                .findBySourceProjectIdx(entity.getIdx())
                .stream()
                .map(this::toRelationDTO)
                .collect(Collectors.toList());

        return ProjectDTO.builder()
                .idx(entity.getIdx())
                .projectName(entity.getProjectName())
                .clientName(entity.getClientName())
                .projectManagerIdx(entity.getProjectManagerIdx())
                .projectManagerName(entity.getProjectManager() != null ?
                        entity.getProjectManager().getEmpName() : null)
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .projectStatus(entity.getProjectStatus())
                .description(entity.getDescription())
                .receiptUrl(entity.getReceiptUrl())
                .memberCount(entity.getProjectMembers() != null ?
                        entity.getProjectMembers().size() : 0)
                .progress(calculateProgress(entity))
                .projectRelations(relations)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .build();
    }

    /**
     * CreateDTO → Entity 변환
     * 프로젝트 신규 생성 시 사용
     */
    public Project toEntity(ProjectCreateDTO dto, Long createdUserIdx) {
        if (dto == null) {
            return null;
        }

        Project project = Project.builder()
                .projectName(dto.getProjectName())
                .clientName(dto.getClientName())
                .projectManagerIdx(dto.getProjectManagerIdx())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .projectStatus(dto.getProjectStatus() != null ?
                        dto.getProjectStatus() : "PLANNING")
                .description(dto.getDescription())
                .isDeleted(false)
                .build();

        // BaseEntity 필드 설정
        project.setCreatedAt(LocalDateTime.now());
        project.setCreatedUserIdx(createdUserIdx);
        project.setUpdatedAt(LocalDateTime.now());
        project.setUpdatedUserIdx(createdUserIdx);

        return project;
    }

    /**
     * UpdateDTO로 기존 Entity 업데이트
     * 프로젝트 수정 시 사용
     */
    public void updateEntity(Project entity, ProjectUpdateDTO dto, Long updatedUserIdx) {
        if (entity == null || dto == null) {
            return;
        }

        // null이 아닌 필드만 업데이트
        if (dto.getProjectName() != null) {
            entity.setProjectName(dto.getProjectName());
        }
        if (dto.getClientName() != null) {
            entity.setClientName(dto.getClientName());
        }
        if (dto.getProjectManagerIdx() != null) {
            entity.setProjectManagerIdx(dto.getProjectManagerIdx());
        }
        if (dto.getStartDate() != null) {
            entity.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null) {
            entity.setEndDate(dto.getEndDate());
        }
        if (dto.getProjectStatus() != null) {
            entity.setProjectStatus(dto.getProjectStatus());
        }
        if (dto.getDescription() != null) {
            entity.setDescription(dto.getDescription());
        }
        if (dto.getReceiptUrl() != null) {
            entity.setReceiptUrl(dto.getReceiptUrl());
        }

        // 수정 정보 업데이트
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedUserIdx(updatedUserIdx);
    }

    /**
     * ProjectRelation Entity → ProjectRelationDTO 변환
     */
    private ProjectRelationDTO toRelationDTO(ProjectRelation relation) {
        if (relation == null) {
            return null;
        }

        return ProjectRelationDTO.builder()
                .idx(relation.getIdx())
                .sourceProjectIdx(relation.getSourceProjectIdx())
                .targetProjectIdx(relation.getTargetProjectIdx())
                .targetProjectName(getTargetProjectName(relation.getTargetProjectIdx()))
                .targetProjectStatus(getTargetProjectStaus(relation.getTargetProjectIdx()))
                .targetProjectManager(getTargetProjectManager(relation.getTargetProjectIdx()))
                .targetPeriod(getTargetProjectPeriod(relation.getTargetProjectIdx()))
                .relationType(relation.getRelationType())
                .description(relation.getDescription())
                .createdAt(relation.getCreatedAt())
                .createdUserIdx(relation.getCreatedUserIdx())
                .build();
    }

    /**
     * 대상 프로젝트명 조회
     */
    private String getTargetProjectName(Long targetProjectIdx) {
        if (targetProjectIdx == null) {
            return null;
        }
        return projectRepository.findById(targetProjectIdx)
                .map(Project::getProjectName)
                .orElse(null);
    }
    /**
     * 대상 프로젝트 상태 조회
     */
    private String getTargetProjectStaus(Long targetProjectIdx) {
        if (targetProjectIdx == null) {
            return null;
        }
        return projectRepository.findById(targetProjectIdx)
                .map(Project::getProjectStatus)
                .orElse(null);
    }
    /**
     * 대상 프로젝트 매니저 이름 조회
     */
    private String getTargetProjectManager(Long targetProjectIdx) {
        if (targetProjectIdx == null) {
            return null;
        }
        return projectRepository.findById(targetProjectIdx)
                .map(Project::getProjectManager)
                .map(User::getEmpName)
                .orElse(null);
    }

    /**
     * 대상 프로젝트 기간 조회 (시작일 ~ 종료일)
     */
    private String getTargetProjectPeriod(Long targetProjectIdx) {
        if (targetProjectIdx == null) {
            return null;
        }
        return projectRepository.findById(targetProjectIdx)
                .map(project -> {
                    if (project.getStartDate() != null && project.getEndDate() != null) {
                        return project.getStartDate() + " ~ " + project.getEndDate();
                    }
                    return null;
                })
                .orElse(null);
    }

    /**
     * 프로젝트 진행률 계산 (날짜 기준)
     *
     * @param project 프로젝트 Entity
     * @return 진행률 (0-100)
     */
    private Integer calculateProgress(Project project) {
        if (project.getStartDate() == null || project.getEndDate() == null) {
            return 0;
        }

        LocalDate now = LocalDate.now();
        LocalDate start = project.getStartDate();
        LocalDate end = project.getEndDate();

        // 시작 전
        if (now.isBefore(start)) {
            return 0;
        }

        // 종료 후
        if (now.isAfter(end)) {
            return 100;
        }

        // 진행 중: (경과일 / 전체일) * 100
        long totalDays = ChronoUnit.DAYS.between(start, end);
        long elapsedDays = ChronoUnit.DAYS.between(start, now);

        if (totalDays == 0) {
            return 0;
        }

        return (int) ((elapsedDays * 100) / totalDays);
    }
}
