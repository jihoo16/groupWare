package com.pinecni.erp.api.project.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.project.dto.*;
import com.pinecni.erp.api.project.repository.ProjectExpenseSettingRepository;
import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import com.pinecni.erp.api.project.repository.ProjectRelationRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectExpenseSetting;
import com.pinecni.erp.entity.ProjectMember;
import com.pinecni.erp.entity.ProjectRelation;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
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
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectExpenseSettingRepository projectExpenseSettingRepository;
    private final ReceiptMeetingRepository receiptMeetingRepository;
    private final ReceiptTripRepository receiptTripRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;

    /**
     * Object[] → DTO 변환 (최적화된 쿼리 결과 변환용)
     */
    public ProjectDTO toDTOFromArray(Object[] row) {
        if (row == null) {
            return null;
        }

        return ProjectDTO.builder()
                .idx((Long) row[0])
                .projectName((String) row[1])
                .clientName((String) row[2])
                .projectManagerIdx((Long) row[3])
                .projectManagerName((String) row[4])
                .startDate((LocalDate) row[5])
                .endDate((LocalDate) row[6])
                .projectStatus((String) row[7])
                .description((String) row[8])
                .receiptUrl((String) row[9])
                .activityBudget((BigDecimal) row[10])
                .equipmentBudget((BigDecimal) row[11])
                .materialBudget((BigDecimal) row[12])
                .progressRate((BigDecimal) row[13])
                .memberCount(((Long) row[14]).intValue())
                .activityUsed((BigDecimal) row[15])
                .equipmentUsed(BigDecimal.ZERO)  // 장비비는 추후 구현
                .materialUsed(BigDecimal.ZERO)   // 재료비는 추후 구현
                .totalPeriodStart((LocalDate) row[16])
                .totalPeriodEnd((LocalDate) row[17])
                .progress(calculateProgressFromDates((LocalDate) row[5], (LocalDate) row[6]))
                .createdAt((LocalDateTime) row[18])
                .updatedAt((LocalDateTime) row[19])
                .createdUserIdx((Long) row[20])
                .updatedUserIdx((Long) row[21])
                .build();
    }

    /**
     * Entity → DTO 변환
     * 프로젝트 조회 시 사용 (단건 조회용)
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

        // 팀원 목록 조회 및 변환 (직급 순으로 정렬)
        List<ProjectMemberDTO> members = projectMemberRepository
                .findByProjectIdx(entity.getIdx())
                .stream()
                .filter(ProjectMember::getIsActive)
                .map(this::toMemberDTO)
                .sorted((m1, m2) -> {
                    // 직급 순서로 정렬 (대표 > 상무 > 이사 > 부장 > 차장 > 과장 > 대리 > 사원)
                    int order1 = getPositionOrder(m1.getEmployeePositionName());
                    int order2 = getPositionOrder(m2.getEmployeePositionName());
                    return Integer.compare(order1, order2);
                })
                .collect(Collectors.toList());

        // 직급별 경비 설정 목록 조회 및 변환
        List<ProjectExpenseSettingDTO> expenseSettings = projectExpenseSettingRepository
                .findByProjectIdx(entity.getIdx())
                .stream()
                .map(this::toExpenseSettingDTO)
                .collect(Collectors.toList());

        // 활동비 사용액 조회 (회의비, 출장비 등 집행 금액 합계)
        BigDecimal meetingUsed = receiptMeetingRepository.sumAmountByProjectIdx(entity.getIdx());
        BigDecimal tripUsed = receiptTripRepository.sumAmountByProjectIdx(entity.getIdx());
        BigDecimal activityUsed = meetingUsed.add(tripUsed);

        // 장비비 사용액 (추후 구현 예정, 현재는 0)
        BigDecimal equipmentUsed = BigDecimal.ZERO;

        // 재료비 사용액 (추후 구현 예정, 현재는 0)
        BigDecimal materialUsed = BigDecimal.ZERO;

        // 프로젝트 관리자 이름 조회 (LAZY 로딩 문제 해결)
        String projectManagerName = null;
        if (entity.getProjectManagerIdx() != null) {
            projectManagerName = userRepository.findById(entity.getProjectManagerIdx())
                    .map(User::getEmpName)
                    .orElse(null);
        }

        return ProjectDTO.builder()
                .idx(entity.getIdx())
                .projectName(entity.getProjectName())
                .clientName(entity.getClientName())
                .projectManagerIdx(entity.getProjectManagerIdx())
                .projectManagerName(projectManagerName)
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .totalPeriodStart(entity.getTotalPeriodStart())
                .totalPeriodEnd(entity.getTotalPeriodEnd())
                .projectStatus(entity.getProjectStatus())
                .description(entity.getDescription())
                .receiptUrl(entity.getReceiptUrl())
                .activityBudget(entity.getActivityBudget())
                .equipmentBudget(entity.getEquipmentBudget())
                .materialBudget(entity.getMaterialBudget())
                .progressRate(entity.getProgressRate())
                .activityUsed(activityUsed)
                .equipmentUsed(equipmentUsed)
                .materialUsed(materialUsed)
                .memberCount(members.size())
                .progress(calculateProgress(entity))
                .projectRelations(relations)
                .projectMembers(members)
                .projectExpenseSettings(expenseSettings)
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
                .totalPeriodStart(dto.getTotalPeriodStart() != null ?
                        dto.getTotalPeriodStart() : dto.getStartDate())
                .totalPeriodEnd(dto.getTotalPeriodEnd() != null ?
                        dto.getTotalPeriodEnd() : dto.getEndDate())
                .projectStatus(dto.getProjectStatus() != null ?
                        dto.getProjectStatus() : "PLANNING")
                .description(dto.getDescription())
                .receiptUrl(dto.getReceiptUrl())
                .isDeleted(false)
                .activityBudget(dto.getActivityBudget())
                .equipmentBudget(dto.getEquipmentBudget())
                .materialBudget(dto.getMaterialBudget())
                .progressRate(dto.getProgressRate() != null ?
                        dto.getProgressRate() : BigDecimal.ZERO)
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
        if (dto.getActivityBudget() != null) {
            entity.setActivityBudget(dto.getActivityBudget());
        }
        if (dto.getEquipmentBudget() != null) {
            entity.setEquipmentBudget(dto.getEquipmentBudget());
        }
        if (dto.getMaterialBudget() != null) {
            entity.setMaterialBudget(dto.getMaterialBudget());
        }
        if (dto.getProgressRate() != null) {
            entity.setProgressRate(dto.getProgressRate());
        }
        if (dto.getTotalPeriodStart() != null) {
            entity.setTotalPeriodStart(dto.getTotalPeriodStart());
        }
        if (dto.getTotalPeriodEnd() != null) {
            entity.setTotalPeriodEnd(dto.getTotalPeriodEnd());
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
     * ProjectMember Entity → ProjectMemberDTO 변환
     */
    private ProjectMemberDTO toMemberDTO(ProjectMember member) {
        if (member == null) {
            return null;
        }

        // 직원 정보 조회
        User employee = userRepository.findById(member.getEmployeeIdx()).orElse(null);

        ProjectMemberDTO dto = ProjectMemberDTO.builder()
                .idx(member.getIdx())
                .projectIdx(member.getProjectIdx())
                .employeeIdx(member.getEmployeeIdx())
                .role(member.getRole())
                .participationStartDate(member.getParticipationStartDate())
                .participationEndDate(member.getParticipationEndDate())
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .createdUserIdx(member.getCreatedUserIdx())
                .updatedUserIdx(member.getUpdatedUserIdx())
                .employeeName(employee != null ? employee.getEmpName() : null)
                .build();

        // 부서명 조회 (코드 → 명칭)
        if (employee != null && employee.getEmpDept() != null) {
            codeRepository.findByGroupCodeAndCode("C01", employee.getEmpDept())
                    .ifPresent(code -> dto.setEmployeeDeptName(code.getCodeName()));
        }

        // 직급명 및 정렬 순서 조회 (코드 → 명칭, sortOrder)
        if (employee != null && employee.getEmpPosition() != null) {
            codeRepository.findByGroupCodeAndCode("C02", employee.getEmpPosition())
                    .ifPresent(code -> {
                        dto.setEmployeePositionName(code.getCodeName());
                        dto.setEmployeePositionSortOrder(code.getSortOrder());
                    });
        }

        return dto;
    }

    /**
     * ProjectExpenseSetting Entity → ProjectExpenseSettingDTO 변환
     * 새 구조: expenseItemName + amount
     */
    private ProjectExpenseSettingDTO toExpenseSettingDTO(ProjectExpenseSetting setting) {
        if (setting == null) {
            return null;
        }

        return ProjectExpenseSettingDTO.builder()
                .positionCode(setting.getPositionCode())
                .positionName(getPositionNameFromCode(setting.getPositionCode()))
                .expenseItemName(setting.getExpenseItemName())
                .expenseItemNameEn(setting.getExpenseItemNameEn())
                .amount(setting.getAmount())
                .build();
    }

    /**
     * 직급 코드를 직급명으로 변환
     */
    private String getPositionNameFromCode(String positionCode) {
        if (positionCode == null) {
            return null;
        }

        switch (positionCode) {
            case "C0201": return "대표이사";
            case "C0202": return "상무";
            case "C0203": return "이사";
            case "C0204": return "부장";
            case "C0205": return "차장";
            case "C0206": return "과장";
            case "C0207": return "대리";
            case "C0208": return "사원";
            default: return positionCode;
        }
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
        return calculateProgressFromDates(project.getStartDate(), project.getEndDate());
    }

    /**
     * 날짜로부터 진행률 계산 (날짜 기준)
     *
     * @param startDate 시작일
     * @param endDate 종료일
     * @return 진행률 (0-100)
     */
    private Integer calculateProgressFromDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            return 0;
        }

        LocalDate now = LocalDate.now();

        // 시작 전
        if (now.isBefore(startDate)) {
            return 0;
        }

        // 종료 후
        if (now.isAfter(endDate)) {
            return 100;
        }

        // 진행 중: (경과일 / 전체일) * 100
        long totalDays = ChronoUnit.DAYS.between(startDate, endDate);
        long elapsedDays = ChronoUnit.DAYS.between(startDate, now);

        if (totalDays == 0) {
            return 0;
        }

        return (int) ((elapsedDays * 100) / totalDays);
    }

    /**
     * 직급 순서 반환 (정렬용)
     * 대표 > 상무 > 이사 > 부장 > 차장 > 과장 > 대리 > 사원 순
     *
     * @param positionName 직급명
     * @return 순서 (낮을수록 높은 직급)
     */
    private int getPositionOrder(String positionName) {
        if (positionName == null) {
            return 999; // 직급 정보 없는 경우 맨 뒤로
        }

        switch (positionName) {
            case "대표":
            case "대표이사":
                return 1;
            case "상무":
            case "상무이사":
                return 2;
            case "이사":
                return 3;
            case "부장":
                return 4;
            case "차장":
                return 5;
            case "과장":
                return 6;
            case "대리":
                return 7;
            case "사원":
                return 8;
            default:
                return 999; // 알 수 없는 직급은 맨 뒤로
        }
    }
}
