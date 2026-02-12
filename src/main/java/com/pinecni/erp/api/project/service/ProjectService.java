package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ProjectCreateDTO;
import com.pinecni.erp.api.project.dto.ProjectDTO;
import com.pinecni.erp.api.project.dto.ProjectExpenseSettingDTO;
import com.pinecni.erp.api.project.dto.ProjectFilterDTO;
import com.pinecni.erp.api.project.dto.ProjectUpdateDTO;
import com.pinecni.erp.api.project.dto.ProjectCardDTO;

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


    List<ProjectDTO> getPastProjects();


    List<ProjectDTO> getPastProjectsByStatus(String status);


    List<ProjectCardDTO> getProjectCards(Long projectIdx);

    /**
     * 프로젝트의 직급별 경비 설정 조회
     */
    List<ProjectExpenseSettingDTO> getProjectExpenseSettings(Long projectIdx);

    /**
     * 특정 사용자가 참여중인 프로젝트 목록 조회
     */
    List<ProjectDTO> getProjectsByMemberIdx(Long memberIdx);

    /**
     * 프로젝트 필터용 목록 조회 (문서 개수 포함)
     */
    List<ProjectFilterDTO> getProjectsForFilter();
}
