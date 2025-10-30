package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ProjectCreateDTO;
import com.pinecni.erp.api.project.dto.ProjectDTO;
import com.pinecni.erp.api.project.dto.ProjectUpdateDTO;

import java.util.List;

/**
 * 프로젝트 Service Interface
 * 비즈니스 로직 메서드 정의
 */
public interface ProjectService {


    List<ProjectDTO> getAllProjects();


    List<ProjectDTO> getProjectsByStatus(String status);


    ProjectDTO getProjectById(Long idx);


    ProjectDTO createProject(ProjectCreateDTO createDTO, Long createdUserIdx);


    ProjectDTO updateProject(Long idx, ProjectUpdateDTO updateDTO, Long updatedUserIdx);


    void deleteProject(Long idx);


    List<ProjectDTO> searchProjectsByName(String name);
}
