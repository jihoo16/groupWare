package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.util.NotificationFormat;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.project.dto.*;
import com.pinecni.erp.api.project.dto.ProjectCardDTO;
import com.pinecni.erp.api.project.mapper.ProjectMapper;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseRepository;
import com.pinecni.erp.api.project.repository.ProjectExpenseSettingRepository;
import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import com.pinecni.erp.api.project.repository.ProjectRelationRepository;
import com.pinecni.erp.api.project.repository.ProjectBudgetAdjustmentRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingSessionRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectBudgetAdjustment;
import com.pinecni.erp.entity.ProjectExpenseSetting;
import com.pinecni.erp.entity.ProjectMember;
import com.pinecni.erp.entity.ProjectRelation;
import com.pinecni.erp.entity.ProjectCard;
import com.pinecni.erp.entity.ReceiptAttendee;
import com.pinecni.erp.entity.ReceiptMeeting;
import com.pinecni.erp.entity.ReceiptOvertime;
import com.pinecni.erp.entity.ReceiptPurchase;
import com.pinecni.erp.entity.ReceiptTrip;
import com.pinecni.erp.entity.ReceiptTripMeeting;
import com.pinecni.erp.entity.ReceiptTripMeetingSession;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.exception.ParticipationConflictDTO;
import com.pinecni.erp.exception.ParticipationPeriodException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
    private final ProjectCardRepository projectCardRepository;
    private final ProjectRelationRepository projectRelationRepository;
    private final ProjectExpenseSettingRepository projectExpenseSettingRepository;
    private final ProjectBudgetAdjustmentRepository budgetAdjustmentRepository;
    private final CodeRepository codeRepository;
    private final ProjectMapper mapper;
    private final ReceiptTripRepository receiptTripRepository;
    private final ReceiptMeetingRepository receiptMeetingRepository;
    private final ReceiptOvertimeRepository receiptOvertimeRepository;
    private final ReceiptPurchaseRepository receiptPurchaseRepository;
    private final ReceiptTripMeetingRepository receiptTripMeetingRepository;
    private final ReceiptTripMeetingSessionRepository receiptTripMeetingSessionRepository;
    private final ReceiptAttendeeRepository receiptAttendeeRepository;
    private final UserRepository userRepository;
    private final com.pinecni.erp.api.notification.service.NotificationEnqueueService notificationEnqueueService;

    @Override
    public List<ProjectDTO> getAllProjects() {
        log.debug("getAllProjects() called - using optimized query");

        // 한 번의 쿼리로 모든 데이터 조회
        return projectRepository.findAllActiveOptimized().stream()
                .map(mapper::toDTOFromArray)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectDTO> getProjectsByStatus(String status) {
        log.debug("getProjectsByStatus() called with status: {} - using optimized query", status);

        // 한 번의 쿼리로 모든 데이터 조회
        return projectRepository.findByProjectStatusOptimized(status).stream()
                .map(mapper::toDTOFromArray)
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
                        .createdUserIdx(createdUserIdx)
                        .build();

                projectRelationRepository.save(relation);
                log.debug("Project relation saved: source={}, target={}",
                         savedProject.getIdx(), relationsDTO.getTargetProjectIdx());
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

                ProjectCard card = ProjectCard.builder()
                        .projectIdx(savedProject.getIdx())
                        .cardCompany(cardDTO.getCardCompany())
                        .cardLastDigits(cardDTO.getCardLastDigits())
                        .cardNickname(cardDTO.getCardNickname())
                        .isActive(true)
                        .build();

                projectCardRepository.save(card);
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
            List<ProjectCard> existingCards = projectCardRepository.findByProjectIdx(idx);
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
                    ProjectCard existingCard = projectCardRepository.findById(cardDTO.getIdx())
                            .orElseThrow(() -> new IllegalArgumentException("카드를 찾을 수 없습니다: " + cardDTO.getIdx()));

                    existingCard.setCardCompany(cardDTO.getCardCompany());
                    existingCard.setCardLastDigits(cardDTO.getCardLastDigits());
                    existingCard.setCardNickname(cardDTO.getCardNickname());
                    existingCard.setIsActive(true);

                    projectCardRepository.save(existingCard);
                    updatedCardIds.add(existingCard.getIdx());

                    log.debug("Research card updated: idx={}, company={}, lastDigits={}",
                             existingCard.getIdx(), cardDTO.getCardCompany(), cardDTO.getCardLastDigits());
                } else {
                    // 신규 카드 생성
                    ProjectCard newCard = ProjectCard.builder()
                            .projectIdx(idx)
                            .cardCompany(cardDTO.getCardCompany())
                            .cardLastDigits(cardDTO.getCardLastDigits())
                            .cardNickname(cardDTO.getCardNickname())
                            .isActive(true)
                            .build();

                    ProjectCard savedCard = projectCardRepository.save(newCard);
                    updatedCardIds.add(savedCard.getIdx());

                    log.debug("Research card created: idx={}, company={}, lastDigits={}",
                             savedCard.getIdx(), cardDTO.getCardCompany(), cardDTO.getCardLastDigits());
                }
            }

            // 3. DTO에 포함되지 않은 기존 카드는 비활성화 (삭제된 것으로 간주)
            for (ProjectCard existingCard : existingCards) {
                if (!updatedCardIds.contains(existingCard.getIdx())) {
                    existingCard.setIsActive(false);
                    projectCardRepository.save(existingCard);
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
                            .createdUserIdx(updatedUserIdx)
                            .build();

                    projectRelationRepository.save(newRelation);
                    log.debug("Project relation created: source={}, target={}",
                             idx, relationDTO.getTargetProjectIdx());
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

            // 0. 참여기간 변경 사전 검사 — 기존 문서가 새 기간 밖으로 밀려나면 차단
            validateMemberPeriodChangesAgainstDocuments(idx, updateDTO.getProjectMembers());

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
                    // 변경 항목 감지 (알림용)
                    java.util.List<String> changes = new java.util.ArrayList<>();
                    if (!java.util.Objects.equals(existingMember.getRole(), memberDTO.getRole())) changes.add("역할");
                    if (!java.util.Objects.equals(existingMember.getParticipationStartDate(), memberDTO.getParticipationStartDate())
                            || !java.util.Objects.equals(existingMember.getParticipationEndDate(), memberDTO.getParticipationEndDate())) {
                        changes.add("참여 기간");
                    }
                    boolean wasInactive = !Boolean.TRUE.equals(existingMember.getIsActive());

                    // 기존 팀원 업데이트
                    existingMember.setRole(memberDTO.getRole());
                    existingMember.setParticipationStartDate(memberDTO.getParticipationStartDate());
                    existingMember.setParticipationEndDate(memberDTO.getParticipationEndDate());
                    existingMember.setIsActive(true);

                    projectMemberRepository.save(existingMember);
                    log.debug("Project member updated: employeeIdx={}, projectIdx={}",
                             memberDTO.getEmployeeIdx(), idx);

                    // 비활성→활성 재참여는 C1911(참여) 로, 그 외 의미 있는 변경은 C1912(정보변경) 로
                    try {
                        if (wasInactive) {
                            enqueueProjectMemberNotification("C1911", project, existingMember, updatedUserIdx, null);
                        } else if (!changes.isEmpty()) {
                            enqueueProjectMemberNotification("C1912", project, existingMember, updatedUserIdx,
                                    String.join(", ", changes));
                        }
                    } catch (Exception e) {
                        log.warn("[프로젝트 알림 enqueue 실패 — 무시하고 진행] empIdx={}, error={}",
                                memberDTO.getEmployeeIdx(), e.getMessage());
                    }
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

                    // C1911 — 신규 멤버 등록 알림
                    try {
                        enqueueProjectMemberNotification("C1911", project, newMember, updatedUserIdx, null);
                    } catch (Exception e) {
                        log.warn("[프로젝트 참여 알림 enqueue 실패 — 무시하고 진행] empIdx={}, error={}",
                                memberDTO.getEmployeeIdx(), e.getMessage());
                    }
                }

                updatedMemberEmployeeIds.add(memberDTO.getEmployeeIdx());
            }

            // 3. DTO에 포함되지 않은 기존 팀원은 비활성화 (삭제된 것으로 간주)
            for (ProjectMember existingMember : existingMembers) {
                if (!updatedMemberEmployeeIds.contains(existingMember.getEmployeeIdx())
                        && Boolean.TRUE.equals(existingMember.getIsActive())) {
                    existingMember.setIsActive(false);
                    projectMemberRepository.save(existingMember);
                    log.debug("Project member deactivated: employeeIdx={}, projectIdx={}",
                             existingMember.getEmployeeIdx(), idx);

                    // C1913 — 프로젝트 제외 알림
                    try {
                        enqueueProjectMemberNotification("C1913", project, existingMember, updatedUserIdx, null);
                    } catch (Exception e) {
                        log.warn("[프로젝트 제외 알림 enqueue 실패 — 무시하고 진행] empIdx={}, error={}",
                                existingMember.getEmployeeIdx(), e.getMessage());
                    }
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
        log.debug("getPastProjects() called - using optimized query");

        // 조인한 프로젝트 조회
        return projectRepository.findPastProjectsOptimized().stream()
                .map(mapper::toDTOFromArray)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectDTO> getPastProjectsByStatus(String status) {
        log.debug("getPastProjectsByStatus() called with status: {} - using optimized query", status);

        // 상태별 프로젝트 조회
        return projectRepository.findPastProjectsByStatus(status).stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectCardDTO> getProjectCards(Long projectIdx) {
        log.debug("getProjectCards() called with projectIdx: {}", projectIdx);

        return projectCardRepository.findByProjectIdx(projectIdx).stream()
                .map(card -> ProjectCardDTO.builder()
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
                .map(setting -> {
                    // 직급 코드로 직급명 조회
                    String positionName = codeRepository.findByGroupCodeAndCode("C02", setting.getPositionCode())
                            .map(code -> code.getCodeName())
                            .orElse(setting.getPositionCode());

                    return ProjectExpenseSettingDTO.builder()
                            .positionCode(setting.getPositionCode())
                            .positionName(positionName)
                            .expenseItemName(setting.getExpenseItemName())
                            .expenseItemNameEn(setting.getExpenseItemNameEn())
                            .amount(setting.getAmount())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectDTO> getProjectsByMemberIdx(Long memberIdx) {
        log.debug("getProjectsByMemberIdx() called with memberIdx: {} - using optimized query", memberIdx);

        // 한 번의 쿼리로 해당 사용자가 참여중인 프로젝트 조회
        return projectRepository.findByMemberIdxOptimized(memberIdx).stream()
                .map(mapper::toDTOFromArray)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectFilterDTO> getProjectsForFilter() {
        log.debug("getProjectsForFilter() called - querying projects with document count");

        List<Object[]> results = projectRepository.findAllProjectsWithDocumentCount();

        return results.stream()
                .map(row -> {
                    Long idx = ((Number) row[0]).longValue();
                    String projectName = (String) row[1];
                    String projectStatus = (String) row[2];
                    Long documentCount = ((Number) row[3]).longValue();

                    // projectStatus를 프론트엔드 형식으로 변환
                    String status = convertProjectStatusToFilterStatus(projectStatus);

                    return ProjectFilterDTO.builder()
                            .idx(idx)
                            .projectName(projectName)
                            .status(status)
                            .documentCount(documentCount.intValue())
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getActivityBudgetUsage(Long projectIdx) {
        log.debug("getActivityBudgetUsage() called with projectIdx: {}", projectIdx);

        Project project = projectRepository.findById(projectIdx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다: " + projectIdx));

        BigDecimal activityBudget = project.getActivityBudget() != null ? project.getActivityBudget() : BigDecimal.ZERO;
        BigDecimal tripTotal       = receiptTripRepository.sumAmountByProjectIdx(projectIdx);
        BigDecimal meetingTotal    = receiptMeetingRepository.sumAmountByProjectIdx(projectIdx);
        BigDecimal overtimeTotal   = receiptOvertimeRepository.sumAmountByProjectIdx(projectIdx);
        BigDecimal tripMeetingTotal = receiptTripMeetingRepository.sumTripFeeByProjectIdx(projectIdx);

        BigDecimal totalSpent = tripTotal.add(meetingTotal).add(overtimeTotal).add(tripMeetingTotal);

        Map<String, Object> result = new HashMap<>();
        result.put("activityBudget", activityBudget);
        result.put("totalSpent", totalSpent);
        result.put("remaining", activityBudget.subtract(totalSpent));
        return result;
    }

    @Override
    public Map<String, Object> getMaterialBudgetUsage(Long projectIdx) {
        Project project = projectRepository.findById(projectIdx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다: " + projectIdx));

        BigDecimal materialBudget = project.getMaterialBudget() != null ? project.getMaterialBudget() : BigDecimal.ZERO;
        BigDecimal totalSpent = receiptPurchaseRepository.sumAmountByProjectIdxAndPurchaseType(projectIdx, "material");

        Map<String, Object> result = new HashMap<>();
        result.put("materialBudget", materialBudget);
        result.put("totalSpent", totalSpent);
        result.put("remaining", materialBudget.subtract(totalSpent));
        return result;
    }

    @Override
    public Map<String, Object> getEquipmentBudgetUsage(Long projectIdx) {
        Project project = projectRepository.findById(projectIdx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다: " + projectIdx));

        BigDecimal equipmentBudget = project.getEquipmentBudget() != null ? project.getEquipmentBudget() : BigDecimal.ZERO;
        BigDecimal totalSpent = receiptPurchaseRepository.sumAmountByProjectIdxAndPurchaseType(projectIdx, "equipment");

        Map<String, Object> result = new HashMap<>();
        result.put("equipmentBudget", equipmentBudget);
        result.put("totalSpent", totalSpent);
        result.put("remaining", equipmentBudget.subtract(totalSpent));
        return result;
    }

    /**
     * DB의 projectStatus를 프론트엔드 필터 형식으로 변환
     * DB 상태: PLANNING(기획), IN_PROGRESS(진행중), COMPLETED(완료), PENDING(대기), CANCELLED(취소)
     * 필터 상태: ACTIVE(진행중), COMPLETED(완료), PAUSED(보류)
     */
    @Override
    @Transactional
    public void saveBudgetAdjustment(Long projectIdx, BudgetAdjustmentRequestDTO dto, Long userIdx) {
        Project project = projectRepository.findById(projectIdx)
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다. idx: " + projectIdx));

        String type = dto.getBudgetType();
        BigDecimal amount = dto.getAdjustmentAmount() != null ? dto.getAdjustmentAmount() : BigDecimal.ZERO;

        // 1. projects 테이블 보정액 컬럼 덮어쓰기
        switch (type) {
            case "ACTIVITY":
                project.setActivityBudgetAdjustment(amount);
                break;
            case "EQUIPMENT":
                project.setEquipmentBudgetAdjustment(amount);
                break;
            case "MATERIAL":
                project.setMaterialBudgetAdjustment(amount);
                break;
            default:
                throw new IllegalArgumentException("유효하지 않은 budgetType: " + type);
        }
        project.setUpdatedUserIdx(userIdx);
        projectRepository.save(project);

        // 2. 이력 테이블 INSERT
        ProjectBudgetAdjustment log = ProjectBudgetAdjustment.builder()
                .projectIdx(projectIdx)
                .budgetType(type)
                .adjustmentAmount(amount)
                .reason(dto.getReason())
                .build();
        log.setCreatedUserIdx(userIdx);
        log.setUpdatedUserIdx(userIdx);
        budgetAdjustmentRepository.save(log);
    }

    private String convertProjectStatusToFilterStatus(String projectStatus) {
        if (projectStatus == null) {
            return "ACTIVE";
        }

        switch (projectStatus) {
            case "PLANNING":        // 기획 -> 진행중 그룹
            case "IN_PROGRESS":     // 진행중 -> 진행중 그룹
                return "ACTIVE";
            case "COMPLETED":       // 완료 -> 완료 그룹
                return "COMPLETED";
            case "PENDING":         // 대기 -> 보류 그룹
            case "CANCELLED":       // 취소 -> 보류 그룹
                return "PAUSED";
            default:
                return "ACTIVE";
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 참여기간 변경 사전 검사 (orphan 문서 차단)
    // ══════════════════════════════════════════════════════════════

    /**
     * 프로젝트 멤버의 참여기간 변경을 사전 검사한다.
     *
     * 차단 케이스:
     * 1) 기존 활성 멤버의 기간이 단축되어, 이미 작성된 ReceiptAttendee 의 documentDate 가
     *    새 기간 [newStart, newEnd] 밖으로 벗어나는 경우
     * 2) 기존 활성 멤버가 DTO 에서 빠져 비활성화되는데, 그 멤버에게 등록된 attendee 가 있는 경우
     *    (모든 attendee 가 orphan 이 됨)
     *
     * 외부 참석자(isExternal=true)는 ProjectMember 와 무관하므로 검증 대상이 아니다.
     */
    private void validateMemberPeriodChangesAgainstDocuments(
            Long projectIdx, List<ProjectMemberCreateDTO> dtoMembers) {
        if (dtoMembers == null) {
            return;
        }

        List<ProjectMember> existingMembers = projectMemberRepository.findByProjectIdx(projectIdx);
        if (existingMembers.isEmpty()) {
            return; // 신규 멤버만 추가되는 경우 — 영향 없음
        }

        Set<Long> dtoEmployeeIdxSet = dtoMembers.stream()
                .map(ProjectMemberCreateDTO::getEmployeeIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));

        // DTO 의 employeeIdx → 새 기간 매핑
        Map<Long, ProjectMemberCreateDTO> dtoByEmployee = new HashMap<>();
        for (ProjectMemberCreateDTO m : dtoMembers) {
            if (m.getEmployeeIdx() != null) {
                dtoByEmployee.put(m.getEmployeeIdx(), m);
            }
        }

        List<ParticipationConflictDTO> conflicts = new ArrayList<>();

        for (ProjectMember existing : existingMembers) {
            if (!Boolean.TRUE.equals(existing.getIsActive())) {
                continue; // 이미 비활성인 멤버는 검사 대상 아님
            }

            Long employeeIdx = existing.getEmployeeIdx();
            if (employeeIdx == null) continue;

            ProjectMemberCreateDTO dtoMember = dtoByEmployee.get(employeeIdx);

            LocalDate newStart;
            LocalDate newEnd;
            if (dtoMember == null) {
                // 케이스 2 — 비활성화: 모든 기존 문서가 orphan
                // 새 기간을 [LocalDate.MAX, LocalDate.MAX] 처럼 처리하면 모두 새 기간 밖이 되므로
                // 메모리 검사에서 newStart=null 케이스로 간주 — addAuthorConflictsForRecords 에서 모두 orphan 처리
                newStart = null;
                newEnd = null;

                // (1) 참석자 기반: 이 멤버의 모든 attendee 가 orphan
                List<ReceiptAttendee> all = receiptAttendeeRepository
                        .findInternalByProjectAndUser(projectIdx, employeeIdx);
                addConflicts(conflicts, all, employeeIdx, null, null);
            } else {
                // 케이스 1 — 기간 변경: 새 기간 밖 attendee 검사
                newStart = dtoMember.getParticipationStartDate();
                newEnd = dtoMember.getParticipationEndDate();
                if (newStart == null) {
                    // 기간 시작이 누락이면 검증 스킵 (다른 검증에서 거부될 것)
                    continue;
                }
                // (1) 참석자 기반: 새 기간 밖 attendee
                List<ReceiptAttendee> orphans = receiptAttendeeRepository
                        .findOrphanedByMemberPeriod(projectIdx, employeeIdx, newStart, newEnd);
                addConflicts(conflicts, orphans, employeeIdx, newStart, newEnd);
            }

            // (2) 작성자 기반 검사 — 6개 receipt 테이블에서 본 멤버가 작성자인 기록 검사
            collectAuthorOrphans(conflicts, projectIdx, employeeIdx, newStart, newEnd);
        }

        if (!conflicts.isEmpty()) {
            throw new ParticipationPeriodException(
                    "ORPHAN_DOCUMENT",
                    buildOrphanMessage(conflicts),
                    conflicts);
        }
    }

    /**
     * 6개 receipt 테이블에서 employeeIdx 가 작성자인 기록을 조회하고,
     * 새 기간 [newStart, newEnd] 밖에 있으면 conflict 에 추가한다.
     *
     * - newStart == null 이면 멤버 비활성화 케이스 — 모든 기록이 orphan
     * - 출장 / 출장+회의 는 종료일 = tripDate + duration 까지 검사
     * - 출장+회의 회의 세션은 별도로 회의 작성자 + meetingDate 검사
     */
    private void collectAuthorOrphans(List<ParticipationConflictDTO> conflicts,
                                      Long projectIdx,
                                      Long employeeIdx,
                                      LocalDate newStart,
                                      LocalDate newEnd) {
        String userName = resolveUserName(employeeIdx);

        // 1) 회의록 (RCM)
        for (ReceiptMeeting rm : receiptMeetingRepository.findActiveByAuthorAndProject(employeeIdx, projectIdx)) {
            if (isOutsideRange(rm.getMeetingDate(), null, newStart, newEnd)) {
                conflicts.add(buildAuthorConflict(employeeIdx, userName, newStart, newEnd,
                        "RCM", rm.getIdx(), rm.getMeetingDate()));
            }
        }

        // 2) 출장 (RCT) — tripDate + duration 까지 검사
        for (ReceiptTrip rt : receiptTripRepository.findActiveByAuthorAndProject(employeeIdx, projectIdx)) {
            LocalDate startD = rt.getTripDate();
            LocalDate endD = startD != null ? startD.plusDays(rt.getDuration() != null ? rt.getDuration() : 0) : null;
            if (isOutsideRange(startD, endD, newStart, newEnd)) {
                conflicts.add(buildAuthorConflict(employeeIdx, userName, newStart, newEnd,
                        "RCT", rt.getIdx(), startD));
            }
        }

        // 3) 야근식대 (RCO)
        for (ReceiptOvertime ro : receiptOvertimeRepository.findActiveByAuthorAndProject(employeeIdx, projectIdx)) {
            if (isOutsideRange(ro.getOvertimeDate(), null, newStart, newEnd)) {
                conflicts.add(buildAuthorConflict(employeeIdx, userName, newStart, newEnd,
                        "RCO", ro.getIdx(), ro.getOvertimeDate()));
            }
        }

        // 4) 출장+회의 (RCTM) — drafter 기준, tripDate + duration 까지 검사
        for (ReceiptTripMeeting rtm : receiptTripMeetingRepository.findActiveByAuthorAndProject(employeeIdx, projectIdx)) {
            LocalDate startD = rtm.getTripDate();
            LocalDate endD = startD != null ? startD.plusDays(rtm.getDuration() != null ? rtm.getDuration() : 0) : null;
            if (isOutsideRange(startD, endD, newStart, newEnd)) {
                conflicts.add(buildAuthorConflict(employeeIdx, userName, newStart, newEnd,
                        "RCTM", rtm.getIdx(), startD));
            }
        }

        // 5) 출장+회의 회의 세션 (RCTM session) — 회의 작성자 기준, meetingDate
        for (ReceiptTripMeetingSession s : receiptTripMeetingSessionRepository.findActiveByAuthorAndProject(employeeIdx, projectIdx)) {
            if (isOutsideRange(s.getMeetingDate(), null, newStart, newEnd)) {
                conflicts.add(buildAuthorConflict(employeeIdx, userName, newStart, newEnd,
                        "RCTM", s.getReceiptTripMeetingIdx(), s.getMeetingDate()));
            }
        }

        // 6) 구매(재료비/장비비, RCP)
        for (ReceiptPurchase rp : receiptPurchaseRepository.findActiveByAuthorAndProject(employeeIdx, projectIdx)) {
            if (isOutsideRange(rp.getApprovalDate(), null, newStart, newEnd)) {
                conflicts.add(buildAuthorConflict(employeeIdx, userName, newStart, newEnd,
                        "RCP", rp.getIdx(), rp.getApprovalDate()));
            }
        }
    }

    /**
     * 문서의 [docStart, docEnd] (docEnd 가 null 이면 단일 날짜) 가 새 기간 [newStart, newEnd] 밖에 있는지.
     * - newStart == null 인 경우: 비활성화 케이스 — 무조건 orphan (true)
     * - docEnd == null 인 경우: 단일 날짜 — docStart 만 검사
     * - newEnd == null 인 경우: 새 기간 종료 미정 (무한)
     */
    private boolean isOutsideRange(LocalDate docStart, LocalDate docEnd,
                                    LocalDate newStart, LocalDate newEnd) {
        if (newStart == null) return true;
        if (docStart == null) return false;
        if (docStart.isBefore(newStart)) return true;
        LocalDate effectiveDocEnd = docEnd != null ? docEnd : docStart;
        if (newEnd != null && effectiveDocEnd.isAfter(newEnd)) return true;
        return false;
    }

    private ParticipationConflictDTO buildAuthorConflict(Long employeeIdx, String userName,
                                                         LocalDate newStart, LocalDate newEnd,
                                                         String docTypePrefix, Long receiptIdx,
                                                         LocalDate documentDate) {
        return ParticipationConflictDTO.builder()
                .userIdx(employeeIdx)
                .userName(userName)
                .periodStart(newStart)
                .periodEnd(newEnd)
                .documentTypePrefix(docTypePrefix)
                .receiptIdx(receiptIdx)
                .documentDate(documentDate)
                .build();
    }

    private void addConflicts(List<ParticipationConflictDTO> conflicts,
                              List<ReceiptAttendee> records,
                              Long employeeIdx,
                              LocalDate newStart,
                              LocalDate newEnd) {
        if (records == null || records.isEmpty()) return;
        String userName = resolveUserName(employeeIdx);
        for (ReceiptAttendee ra : records) {
            conflicts.add(ParticipationConflictDTO.builder()
                    .userIdx(employeeIdx)
                    .userName(userName)
                    .periodStart(newStart)
                    .periodEnd(newEnd)
                    .documentTypePrefix(ra.getDocumentTypePrefix())
                    .receiptIdx(ra.getReceiptIdx())
                    .documentDate(ra.getDocumentDate())
                    .build());
        }
    }

    private String resolveUserName(Long userIdx) {
        if (userIdx == null) return null;
        return userRepository.findById(userIdx)
                .map(User::getEmpName)
                .orElse("(알 수 없음, IDX=" + userIdx + ")");
    }

    private String buildOrphanMessage(List<ParticipationConflictDTO> conflicts) {
        // 사용자별로 그룹핑해서 첫 줄에 요약, 그 뒤 상세 행
        Map<String, Long> countByName = conflicts.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getUserName() != null ? c.getUserName() : "(알 수 없음)",
                        Collectors.counting()));
        StringBuilder sb = new StringBuilder();
        sb.append("참여기간을 변경할 수 없습니다. 새 기간 밖에 위치한 기존 문서가 있습니다:\n");
        countByName.forEach((name, count) ->
                sb.append("- ").append(name).append(": ").append(count).append("건\n"));
        sb.append("해당 문서를 먼저 수정하거나 삭제해야 멤버 기간을 변경할 수 있습니다.");
        return sb.toString();
    }

    // =========================================================================
    // 프로젝트 멤버 알림 (Phase 5 — C1911/C1912/C1913)
    // =========================================================================

    /**
     * 본인이 자기 자신을 등록/변경/제외해도 알림 SKIP. 외부인은 employeeIdx 가 user.idx 이므로 정상 사용자만 매칭.
     *
     * @param type C1911(참여) / C1912(정보변경) / C1913(제외)
     * @param changedFields C1912 일 때만 채움 (예: "역할, 참여 기간"). 다른 종류는 null.
     */
    private void enqueueProjectMemberNotification(String type, Project project, ProjectMember member,
                                                  Long actorUserIdx, String changedFields) {
        if (project == null || member == null || member.getEmployeeIdx() == null) return;

        java.time.format.DateTimeFormatter dateFmt = NotificationFormat.EVENT_DATE;
        java.time.format.DateTimeFormatter dtFmt   = NotificationFormat.EVENT_TIME;

        String roleName = member.getRole() != null
                ? codeRepository.findByCode(member.getRole())
                        .map(com.pinecni.erp.entity.Code::getCodeName).orElse(member.getRole())
                : "";
        String actorName = actorUserIdx != null
                ? userRepository.findById(actorUserIdx)
                        .map(com.pinecni.erp.entity.User::getEmpName).orElse("관리자")
                : "관리자";

        java.util.Map<String, Object> vars = new java.util.LinkedHashMap<>();
        vars.put("projectName",            project.getProjectName() != null ? project.getProjectName() : "");
        vars.put("memberRole",             roleName);
        vars.put("participationStartDate", member.getParticipationStartDate() != null
                ? member.getParticipationStartDate().format(dateFmt) : "-");
        vars.put("participationEndDate",   member.getParticipationEndDate() != null
                ? member.getParticipationEndDate().format(dateFmt) : "-");
        vars.put("changedFields",          changedFields != null ? changedFields : "");
        vars.put("actorName",              actorName);
        vars.put("eventTime",              java.time.LocalDateTime.now().format(dtFmt));
        vars.put("projectIdx",             project.getIdx());
        vars.put("deepLink",               "/project-detail?idx=" + project.getIdx());

        notificationEnqueueService.enqueue(
                com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                        .notificationType(type)
                        .channel("C2101")
                        .channel("C2103")
                        .recipientUserIdx(member.getEmployeeIdx())
                        .actorUserIdx(actorUserIdx)
                        .targetType("C1704")  // project_member
                        .targetIdx(member.getIdx())
                        .variables(vars)
                        .dedupKey("PRJ-" + type + ":" + project.getIdx() + ":" + member.getEmployeeIdx() + ":"
                                + java.time.LocalDateTime.now().format(NotificationFormat.DEDUP_TIMESTAMP))
                        .build());
    }
}
