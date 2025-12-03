package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.project.dto.*;
import com.pinecni.erp.api.project.dto.ResearchCardDTO;
import com.pinecni.erp.api.project.mapper.ProjectMapper;
import com.pinecni.erp.api.project.repository.ProjectExpenseSettingRepository;
import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import com.pinecni.erp.api.project.repository.ProjectRelationRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ResearchCardRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectExpenseSetting;
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
    private final ProjectExpenseSettingRepository projectExpenseSettingRepository;
    private final CodeRepository codeRepository;
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
        if (createDTO.getProjectMembers() != null && !createDTO.getProjectMembers().isEmpty()) {
            log.debug("Saving {} team members for project idx={}", createDTO.getProjectMembers().size(), savedProject.getIdx());

            for (ProjectMemberCreateDTO memberDTO : createDTO.getProjectMembers()) {
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

        // 직급별 경비 설정 저장 (새 구조: expenseItemName + amount)
        if (createDTO.getExpenseSettings() != null && !createDTO.getExpenseSettings().isEmpty()) {
            log.debug("Saving {} expense settings for project idx={}", createDTO.getExpenseSettings().size(), savedProject.getIdx());

            for (ProjectExpenseSettingCreateDTO settingDTO : createDTO.getExpenseSettings()) {
                // 직급명으로 코드 조회 (positionCode가 없는 경우)
                String positionCode = settingDTO.getPositionCode();
                if (positionCode == null) {
                    positionCode = codeRepository.findByGroupCodeAndCodeName("C02", settingDTO.getPositionCode())
                            .map(code -> code.getCode())
                            .orElse(null);
                }

                if (positionCode == null) {

                    continue;
                }

                // 새 구조: 경비 항목명 + 금액으로 저장
                ProjectExpenseSetting setting = ProjectExpenseSetting.builder()
                        .projectIdx(savedProject.getIdx())
                        .positionCode(positionCode)
                        .expenseItemName(settingDTO.getExpenseItemName())
                        .expenseItemNameEn(settingDTO.getExpenseItemNameEn())
                        .amount(settingDTO.getAmount() != null ? settingDTO.getAmount() : 0)
                        .build();

                // BaseEntity 필드 설정
                setting.setCreatedUserIdx(createdUserIdx);
                setting.setUpdatedUserIdx(createdUserIdx);

                projectExpenseSettingRepository.save(setting);
                log.debug("Expense setting saved: item={}, amount={}, projectIdx={}",
                        settingDTO.getExpenseItemName(),
                         settingDTO.getAmount(), savedProject.getIdx());
            }
        }

        log.info("Project created: idx={}, name={}, teamMembers={}, researchCards={}, expenseSettings={}",
                 savedProject.getIdx(),
                 savedProject.getProjectName(),
                 createDTO.getProjectMembers() != null ? createDTO.getProjectMembers().size() : 0,
                 createDTO.getProjectCards() != null ? createDTO.getProjectCards().size() : 0,
                 createDTO.getExpenseSettings() != null ? createDTO.getExpenseSettings().size() : 0);
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

        // 연구비 카드 업데이트
        if (updateDTO.getProjectCards() != null) {
            log.debug("Updating {} research cards for project idx={}", updateDTO.getProjectCards().size(), idx);

            // 1. 기존 활성 카드 목록 조회
            List<ResearchCard> existingCards = researchCardRepository.findByProjectIdx(idx);
            java.util.Set<Long> updatedCardIds = new java.util.HashSet<>();

            // 2. DTO의 카드 처리 (생성 또는 업데이트)
            for (ProjectCardCreateDTO cardDTO : updateDTO.getProjectCards()) {
                // 카드 뒷 4자리 검증
                if (cardDTO.getCardLastDigits() == null || !cardDTO.getCardLastDigits().matches("\\d{4}")) {
                    log.warn("Invalid card last digits: {}. Skipping card for project idx={}",
                             cardDTO.getCardLastDigits(), idx);
                    continue;
                }

                if (cardDTO.getIdx() != null && cardDTO.getIdx() > 0) {
                    // 기존 카드 업데이트
                    ResearchCard existingCard = researchCardRepository.findById(cardDTO.getIdx())
                            .orElseThrow(() -> new IllegalArgumentException("카드를 찾을 수 없습니다: " + cardDTO.getIdx()));

                    existingCard.setCardCompany(cardDTO.getCardCompany());
                    existingCard.setCardLastDigits(cardDTO.getCardLastDigits());
                    existingCard.setCardNickname(cardDTO.getCardNickname());
                    existingCard.setIsActive(true);

                    researchCardRepository.save(existingCard);
                    updatedCardIds.add(existingCard.getIdx());

                    log.debug("Research card updated: idx={}, company={}, lastDigits={}",
                             existingCard.getIdx(), cardDTO.getCardCompany(), cardDTO.getCardLastDigits());
                } else {
                    // 신규 카드 생성
                    ResearchCard newCard = ResearchCard.builder()
                            .projectIdx(idx)
                            .cardCompany(cardDTO.getCardCompany())
                            .cardLastDigits(cardDTO.getCardLastDigits())
                            .cardNickname(cardDTO.getCardNickname())
                            .isActive(true)
                            .build();

                    ResearchCard savedCard = researchCardRepository.save(newCard);
                    updatedCardIds.add(savedCard.getIdx());

                    log.debug("Research card created: idx={}, company={}, lastDigits={}",
                             savedCard.getIdx(), cardDTO.getCardCompany(), cardDTO.getCardLastDigits());
                }
            }

            // 3. DTO에 포함되지 않은 기존 카드는 비활성화 (삭제된 것으로 간주)
            for (ResearchCard existingCard : existingCards) {
                if (!updatedCardIds.contains(existingCard.getIdx())) {
                    existingCard.setIsActive(false);
                    researchCardRepository.save(existingCard);
                    log.debug("Research card deactivated: idx={}", existingCard.getIdx());
                }
            }
        }

        // 연계 프로젝트 업데이트
        if (updateDTO.getProjectRelations() != null) {
            log.debug("Updating {} project relations for project idx={}", updateDTO.getProjectRelations().size(), idx);

            // 1. 기존 연계 프로젝트 목록 조회
            List<ProjectRelation> existingRelations = projectRelationRepository.findBySourceProjectIdx(idx);
            java.util.Set<Long> updatedRelationTargetIds = new java.util.HashSet<>();

            // 2. DTO의 연계 프로젝트 처리 (생성 또는 유지)
            for (ProjectRelationsCreateDTO relationDTO : updateDTO.getProjectRelations()) {
                if (relationDTO.getTargetProjectIdx() == null) {
                    log.warn("Target project idx is null. Skipping relation for project idx={}", idx);
                    continue;
                }

                // 기존 연계 관계 확인
                boolean exists = existingRelations.stream()
                        .anyMatch(r -> r.getTargetProjectIdx().equals(relationDTO.getTargetProjectIdx()));

                if (!exists) {
                    // 신규 연계 관계 생성
                    ProjectRelation newRelation = ProjectRelation.builder()
                            .sourceProjectIdx(idx)
                            .targetProjectIdx(relationDTO.getTargetProjectIdx())
                            .relationType(relationDTO.getRelationType() != null ?
                                    relationDTO.getRelationType() : "RELATED")
                            .description(relationDTO.getDescription())
                            .createdUserIdx(updatedUserIdx)
                            .build();

                    projectRelationRepository.save(newRelation);
                    log.debug("Project relation created: source={}, target={}, type={}",
                             idx, relationDTO.getTargetProjectIdx(), newRelation.getRelationType());
                }

                updatedRelationTargetIds.add(relationDTO.getTargetProjectIdx());
            }

            // 3. DTO에 포함되지 않은 기존 연계 관계는 삭제
            for (ProjectRelation existingRelation : existingRelations) {
                if (!updatedRelationTargetIds.contains(existingRelation.getTargetProjectIdx())) {
                    projectRelationRepository.delete(existingRelation);
                    log.debug("Project relation deleted: idx={}, target={}",
                             existingRelation.getIdx(), existingRelation.getTargetProjectIdx());
                }
            }
        }
        // 팀원 업데이트
        if (updateDTO.getProjectMembers() != null) {
            log.debug("Updating {} project members for project idx={}", updateDTO.getProjectMembers().size(), idx);

            // 1. 기존 활성 팀원 목록 조회
            List<ProjectMember> existingMembers = projectMemberRepository.findByProjectIdx(idx);
            java.util.Set<Long> updatedMemberEmployeeIds = new java.util.HashSet<>();

            // 2. DTO의 팀원 처리 (생성 또는 업데이트)
            for (ProjectMemberCreateDTO memberDTO : updateDTO.getProjectMembers()) {
                if (memberDTO.getEmployeeIdx() == null) {
                    log.warn("Employee idx is null. Skipping member for project idx={}", idx);
                    continue;
                }

                // 기존 팀원 확인 (같은 직원이 이미 등록되어 있는지)
                ProjectMember existingMember = existingMembers.stream()
                        .filter(m -> m.getEmployeeIdx().equals(memberDTO.getEmployeeIdx()))
                        .findFirst()
                        .orElse(null);

                if (existingMember != null) {
                    // 기존 팀원 업데이트
                    existingMember.setRole(memberDTO.getRole());
                    existingMember.setParticipationStartDate(memberDTO.getParticipationStartDate());
                    existingMember.setParticipationEndDate(memberDTO.getParticipationEndDate());
                    existingMember.setIsActive(true);

                    projectMemberRepository.save(existingMember);
                    log.debug("Project member updated: employeeIdx={}, projectIdx={}",
                             memberDTO.getEmployeeIdx(), idx);
                } else {
                    // 신규 팀원 생성
                    ProjectMember newMember = ProjectMember.builder()
                            .projectIdx(idx)
                            .employeeIdx(memberDTO.getEmployeeIdx())
                            .role(memberDTO.getRole())
                            .participationStartDate(memberDTO.getParticipationStartDate())
                            .participationEndDate(memberDTO.getParticipationEndDate())
                            .isActive(true)
                            .build();

                    projectMemberRepository.save(newMember);
                    log.debug("Project member created: employeeIdx={}, projectIdx={}",
                             memberDTO.getEmployeeIdx(), idx);
                }

                updatedMemberEmployeeIds.add(memberDTO.getEmployeeIdx());
            }

            // 3. DTO에 포함되지 않은 기존 팀원은 비활성화 (삭제된 것으로 간주)
            for (ProjectMember existingMember : existingMembers) {
                if (!updatedMemberEmployeeIds.contains(existingMember.getEmployeeIdx())) {
                    existingMember.setIsActive(false);
                    projectMemberRepository.save(existingMember);
                    log.debug("Project member deactivated: employeeIdx={}, projectIdx={}",
                             existingMember.getEmployeeIdx(), idx);
                }
            }
        }
        // 직급별 경비 업데이트 (새 구조: expenseItemName + amount)
        if (updateDTO.getProjectExpenseSettings() != null) {
            log.debug("Updating {} expense settings for project idx={}", updateDTO.getProjectExpenseSettings().size(), idx);

            // 1. 기존 직급별 경비 설정 목록 조회
            List<ProjectExpenseSetting> existingSettings = projectExpenseSettingRepository.findByProjectIdx(idx);
            java.util.Set<String> updatedKeys = new java.util.HashSet<>();

            // 2. DTO의 경비 설정 처리 (생성 또는 업데이트)
            for (ProjectExpenseSettingDTO settingDTO : updateDTO.getProjectExpenseSettings()) {
                if (settingDTO.getPositionCode() == null || settingDTO.getExpenseItemName() == null) {
                    log.warn("Position code or expense item name is null. Skipping expense setting for project idx={}", idx);
                    continue;
                }

                String key = settingDTO.getPositionCode() + "_" + settingDTO.getExpenseItemName();

                // 기존 경비 설정 확인 (같은 직급 + 경비 항목 조합)
                ProjectExpenseSetting existingSetting = existingSettings.stream()
                        .filter(s -> s.getPositionCode() != null &&
                                     s.getPositionCode().equals(settingDTO.getPositionCode()) &&
                                     s.getExpenseItemName() != null &&
                                     s.getExpenseItemName().equals(settingDTO.getExpenseItemName()))
                        .findFirst()
                        .orElse(null);

                if (existingSetting != null) {
                    // 기존 경비 설정 업데이트
                    existingSetting.setExpenseItemNameEn(settingDTO.getExpenseItemNameEn());
                    existingSetting.setAmount(settingDTO.getAmount() != null ? settingDTO.getAmount() : 0);
                    existingSetting.setUpdatedUserIdx(updatedUserIdx);

                    projectExpenseSettingRepository.save(existingSetting);
                    log.debug("Expense setting updated: positionCode={}, item={}, amount={}, projectIdx={}",
                             settingDTO.getPositionCode(), settingDTO.getExpenseItemName(),
                             settingDTO.getAmount(), idx);
                } else {
                    // 신규 경비 설정 생성
                    ProjectExpenseSetting newSetting = ProjectExpenseSetting.builder()
                            .projectIdx(idx)
                            .positionCode(settingDTO.getPositionCode())
                            .expenseItemName(settingDTO.getExpenseItemName())
                            .expenseItemNameEn(settingDTO.getExpenseItemNameEn())
                            .amount(settingDTO.getAmount() != null ? settingDTO.getAmount() : 0)
                            .build();

                    // BaseEntity 필드 설정
                    newSetting.setCreatedUserIdx(updatedUserIdx);
                    newSetting.setUpdatedUserIdx(updatedUserIdx);

                    projectExpenseSettingRepository.save(newSetting);
                    log.debug("Expense setting created: positionCode={}, item={}, amount={}, projectIdx={}",
                             settingDTO.getPositionCode(), settingDTO.getExpenseItemName(),
                             settingDTO.getAmount(), idx);
                }

                updatedKeys.add(key);
            }

            // 3. DTO에 포함되지 않은 기존 경비 설정은 삭제
            for (ProjectExpenseSetting existingSetting : existingSettings) {
                // expenseItemName이 null인 구 데이터는 무조건 삭제
                if (existingSetting.getExpenseItemName() == null) {
                    projectExpenseSettingRepository.delete(existingSetting);
                    log.debug("Old expense setting deleted (null expenseItemName): idx={}, positionCode={}",
                             existingSetting.getIdx(), existingSetting.getPositionCode());
                    continue;
                }

                String existingKey = existingSetting.getPositionCode() + "_" + existingSetting.getExpenseItemName();
                if (!updatedKeys.contains(existingKey)) {
                    projectExpenseSettingRepository.delete(existingSetting);
                    log.debug("Expense setting deleted: idx={}, positionCode={}, item={}",
                             existingSetting.getIdx(), existingSetting.getPositionCode(),
                             existingSetting.getExpenseItemName());
                }
            }
        }

        log.info("Project updated: idx={}, name={}, cards={}, relations={}, members={}, expenseSettings={}",
                 updatedProject.getIdx(),
                 updatedProject.getProjectName(),
                 updateDTO.getProjectCards() != null ? updateDTO.getProjectCards().size() : 0,
                 updateDTO.getProjectRelations() != null ? updateDTO.getProjectRelations().size() : 0,
                 updateDTO.getProjectMembers() != null ? updateDTO.getProjectMembers().size() : 0,
                 updateDTO.getProjectExpenseSettings() != null ? updateDTO.getProjectExpenseSettings().size() : 0);
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

    @Override
    public List<ProjectDTO> getPastProjects() {
        log.debug("getPastProjects() called");

        return projectRepository.findPastProjects().stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectDTO> getPastProjectsByStatus(String status) {
        log.debug("getPastProjectsByStatus() called with status: {}", status);

        return projectRepository.findPastProjectsByStatus(status).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ResearchCardDTO> getProjectCards(Long projectIdx) {
        log.debug("getProjectCards() called with projectIdx: {}", projectIdx);

        return researchCardRepository.findByProjectIdx(projectIdx).stream()
                .map(card -> ResearchCardDTO.builder()
                        .idx(card.getIdx())
                        .projectIdx(card.getProjectIdx())
                        .cardCompany(card.getCardCompany())
                        .cardLastDigits(card.getCardLastDigits())
                        .cardNickname(card.getCardNickname())
                        .isActive(card.getIsActive())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectExpenseSettingDTO> getProjectExpenseSettings(Long projectIdx) {
        log.debug("getProjectExpenseSettings() called with projectIdx: {}", projectIdx);

        return projectExpenseSettingRepository.findByProjectIdx(projectIdx).stream()
                .map(setting -> ProjectExpenseSettingDTO.builder()
                        .positionCode(setting.getPositionCode())
                        .expenseItemName(setting.getExpenseItemName())
                        .expenseItemNameEn(setting.getExpenseItemNameEn())
                        .amount(setting.getAmount())
                        .build())
                .collect(Collectors.toList());
    }
}
