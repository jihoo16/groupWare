package com.pinecni.erp.api.project.mapper;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.project.dto.*;
import com.pinecni.erp.api.project.repository.ProjectExpenseSettingRepository;
import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import com.pinecni.erp.api.project.repository.ProjectRelationRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripMeetingRepository;
import com.pinecni.erp.api.project.repository.ReceiptTripRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.document.repository.ReceiptPurchaseRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectExpenseSetting;
import com.pinecni.erp.entity.ProjectMember;
import com.pinecni.erp.entity.ProjectRelation;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import com.pinecni.erp.entity.Code;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
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
    private final ReceiptTripMeetingRepository receiptTripMeetingRepository;
    private final ReceiptOvertimeRepository receiptOvertimeRepository;
    private final ReceiptPurchaseRepository receiptPurchaseRepository;
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
                .equipmentUsed(receiptPurchaseRepository.sumAmountByProjectIdxAndPurchaseType((Long) row[0], "equipment"))
                .materialUsed(receiptPurchaseRepository.sumAmountByProjectIdxAndPurchaseType((Long) row[0], "material"))
                .totalPeriodStart((LocalDate) row[16])
                .totalPeriodEnd((LocalDate) row[17])
                .progress(calculateProgressFromDates((LocalDate) row[5], (LocalDate) row[6]))
                .createdAt((LocalDateTime) row[18])
                .updatedAt((LocalDateTime) row[19])
                .createdUserIdx((Long) row[20])
                .updatedUserIdx((Long) row[21])
                .activityAdjustment(row[22] != null ? (BigDecimal) row[22] : BigDecimal.ZERO)
                .equipmentAdjustment(row[23] != null ? (BigDecimal) row[23] : BigDecimal.ZERO)
                .materialAdjustment(row[24] != null ? (BigDecimal) row[24] : BigDecimal.ZERO)
                .build();
    }

    /**
     * Entity → DTO 변환
     * 프로젝트 조회 시 사용 (단건 조회용)
     * N+1 방지: 연관 데이터를 배치 조회 후 Map으로 처리
     */
    public ProjectDTO toDTO(Project entity) {
        if (entity == null) {
            return null;
        }

        // ── 1. 연계 프로젝트 목록 조회 (1 query) ──────────────────
        List<ProjectRelation> relations = projectRelationRepository.findBySourceProjectIdx(entity.getIdx());

        // ── 2. 연계 대상 프로젝트 배치 조회 (1 query) ─────────────
        List<Long> targetIdxList = relations.stream()
                .map(ProjectRelation::getTargetProjectIdx)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, Project> targetProjectMap = targetIdxList.isEmpty()
                ? Collections.emptyMap()
                : projectRepository.findAllById(targetIdxList).stream()
                        .collect(Collectors.toMap(Project::getIdx, p -> p));

        // ── 3. 팀원 목록 조회 (1 query) ───────────────────────────
        List<ProjectMember> memberEntities = projectMemberRepository.findByProjectIdx(entity.getIdx());

        // ── 4. User 배치 조회: 팀원 + 현재/연계 프로젝트 매니저 (1 query) ──
        Set<Long> userIdxSet = memberEntities.stream()
                .filter(ProjectMember::getIsActive)
                .map(ProjectMember::getEmployeeIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        if (entity.getProjectManagerIdx() != null) {
            userIdxSet.add(entity.getProjectManagerIdx());
        }
        targetProjectMap.values().forEach(tp -> {
            if (tp.getProjectManagerIdx() != null) {
                userIdxSet.add(tp.getProjectManagerIdx());
            }
        });
        Map<Long, User> userMap = userIdxSet.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(userIdxSet).stream()
                        .collect(Collectors.toMap(User::getIdx, u -> u));

        // ── 5. 코드 배치 조회 (2 queries) ─────────────────────────
        Map<String, String> deptCodeMap = codeRepository.findByGroupCode("C01").stream()
                .collect(Collectors.toMap(Code::getCode, Code::getCodeName, (a, b) -> a));
        List<Code> positionCodes = codeRepository.findByGroupCode("C02");
        Map<String, String> positionNameMap = positionCodes.stream()
                .collect(Collectors.toMap(Code::getCode, Code::getCodeName, (a, b) -> a));
        Map<String, Integer> positionSortMap = positionCodes.stream()
                .collect(Collectors.toMap(Code::getCode, Code::getSortOrder, (a, b) -> a));

        // ── 6. 경비 설정 (1 query) ────────────────────────────────
        List<ProjectExpenseSettingDTO> expenseSettings = projectExpenseSettingRepository
                .findByProjectIdx(entity.getIdx()).stream()
                .map(this::toExpenseSettingDTO)
                .collect(Collectors.toList());

        // ── 7. 사용액 집계 (6 queries) ────────────────────────────
        BigDecimal meetingUsed = receiptMeetingRepository.sumAmountByProjectIdx(entity.getIdx());
        BigDecimal tripUsed = receiptTripRepository.sumAmountByProjectIdx(entity.getIdx());
        BigDecimal overtimeUsed = receiptOvertimeRepository.sumAmountByProjectIdx(entity.getIdx());
        BigDecimal tripMeetingUsedTotal = receiptTripMeetingRepository.sumTripFeeByProjectIdx(entity.getIdx());
        BigDecimal activityUsed = meetingUsed.add(tripUsed).add(overtimeUsed).add(tripMeetingUsedTotal);
        BigDecimal equipmentUsed = receiptPurchaseRepository.sumAmountByProjectIdxAndPurchaseType(entity.getIdx(), "equipment");
        BigDecimal materialUsed = receiptPurchaseRepository.sumAmountByProjectIdxAndPurchaseType(entity.getIdx(), "material");

        // ── 변환 ──────────────────────────────────────────────────
        List<ProjectRelationDTO> relationDTOs = relations.stream()
                .map(r -> toRelationDTO(r, targetProjectMap, userMap))
                .collect(Collectors.toList());

        List<ProjectMemberDTO> members = memberEntities.stream()
                .filter(ProjectMember::getIsActive)
                .map(m -> toMemberDTO(m, userMap, deptCodeMap, positionNameMap, positionSortMap))
                .sorted((m1, m2) -> Integer.compare(
                        getPositionOrder(m1.getEmployeePositionName()),
                        getPositionOrder(m2.getEmployeePositionName())))
                .collect(Collectors.toList());

        String projectManagerName = entity.getProjectManagerIdx() != null
                ? Optional.ofNullable(userMap.get(entity.getProjectManagerIdx()))
                        .map(User::getEmpName).orElse(null)
                : null;

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
                .meetingUsed(meetingUsed)
                .tripUsed(tripUsed)
                .tripMeetingUsed(tripMeetingUsedTotal)
                .overtimeUsed(overtimeUsed)
                .equipmentUsed(equipmentUsed)
                .materialUsed(materialUsed)
                .activityAdjustment(entity.getActivityBudgetAdjustment() != null ? entity.getActivityBudgetAdjustment() : BigDecimal.ZERO)
                .equipmentAdjustment(entity.getEquipmentBudgetAdjustment() != null ? entity.getEquipmentBudgetAdjustment() : BigDecimal.ZERO)
                .materialAdjustment(entity.getMaterialBudgetAdjustment() != null ? entity.getMaterialBudgetAdjustment() : BigDecimal.ZERO)
                .memberCount(members.size())
                .progress(calculateProgress(entity))
                .projectRelations(relationDTOs)
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
     * 배치 조회된 Map을 사용해 DB 호출 없이 처리
     */
    private ProjectRelationDTO toRelationDTO(ProjectRelation relation,
                                              Map<Long, Project> targetProjectMap,
                                              Map<Long, User> userMap) {
        if (relation == null) {
            return null;
        }

        Project target = relation.getTargetProjectIdx() != null
                ? targetProjectMap.get(relation.getTargetProjectIdx())
                : null;

        String targetManagerName = null;
        if (target != null && target.getProjectManagerIdx() != null) {
            User manager = userMap.get(target.getProjectManagerIdx());
            targetManagerName = manager != null ? manager.getEmpName() : null;
        }

        String targetPeriod = null;
        if (target != null && target.getStartDate() != null && target.getEndDate() != null) {
            targetPeriod = target.getStartDate() + " ~ " + target.getEndDate();
        }

        return ProjectRelationDTO.builder()
                .idx(relation.getIdx())
                .sourceProjectIdx(relation.getSourceProjectIdx())
                .targetProjectIdx(relation.getTargetProjectIdx())
                .targetProjectName(target != null ? target.getProjectName() : null)
                .targetProjectStatus(target != null ? target.getProjectStatus() : null)
                .targetProjectManager(targetManagerName)
                .targetPeriod(targetPeriod)
                .targetTotalPeriodStart(target != null && target.getTotalPeriodStart() != null
                        ? target.getTotalPeriodStart().toString() : null)
                .targetTotalPeriodEnd(target != null && target.getTotalPeriodEnd() != null
                        ? target.getTotalPeriodEnd().toString() : null)
                .createdAt(relation.getCreatedAt())
                .createdUserIdx(relation.getCreatedUserIdx())
                .build();
    }

    /**
     * ProjectMember Entity → ProjectMemberDTO 변환
     * 배치 조회된 Map을 사용해 DB 호출 없이 처리
     */
    /**
     * 멤버 엔티티 리스트를 DTO 리스트로 변환 (가벼운 변환 — 예산/관계 등 미포함)
     *
     * 참여기간 검증용 엔드포인트(/members/active)처럼 멤버 정보만 필요한 경우 사용한다.
     * - User, Code 배치 조회만 수행 (4 queries 수준)
     * - 직급 정렬 순서로 정렬
     */
    public List<ProjectMemberDTO> mapMembersOnly(List<ProjectMember> memberEntities) {
        if (memberEntities == null || memberEntities.isEmpty()) {
            return Collections.emptyList();
        }

        // User 배치 조회
        Set<Long> userIdxSet = memberEntities.stream()
                .map(ProjectMember::getEmployeeIdx)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        Map<Long, User> userMap = userIdxSet.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(userIdxSet).stream()
                        .collect(Collectors.toMap(User::getIdx, u -> u));

        // Code 배치 조회
        Map<String, String> deptCodeMap = codeRepository.findByGroupCode("C01").stream()
                .collect(Collectors.toMap(Code::getCode, Code::getCodeName, (a, b) -> a));
        List<Code> positionCodes = codeRepository.findByGroupCode("C02");
        Map<String, String> positionNameMap = positionCodes.stream()
                .collect(Collectors.toMap(Code::getCode, Code::getCodeName, (a, b) -> a));
        Map<String, Integer> positionSortMap = positionCodes.stream()
                .collect(Collectors.toMap(Code::getCode, Code::getSortOrder, (a, b) -> a));

        return memberEntities.stream()
                .map(m -> toMemberDTO(m, userMap, deptCodeMap, positionNameMap, positionSortMap))
                .sorted((m1, m2) -> Integer.compare(
                        getPositionOrder(m1.getEmployeePositionName()),
                        getPositionOrder(m2.getEmployeePositionName())))
                .collect(Collectors.toList());
    }

    private ProjectMemberDTO toMemberDTO(ProjectMember member,
                                          Map<Long, User> userMap,
                                          Map<String, String> deptCodeMap,
                                          Map<String, String> positionNameMap,
                                          Map<String, Integer> positionSortMap) {
        if (member == null) {
            return null;
        }

        User employee = member.getEmployeeIdx() != null ? userMap.get(member.getEmployeeIdx()) : null;

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

        if (employee != null) {
            if (employee.getEmpDept() != null) {
                dto.setEmployeeDeptName(deptCodeMap.get(employee.getEmpDept()));
            }
            if (employee.getEmpPosition() != null) {
                dto.setEmployeePositionCode(employee.getEmpPosition());
                dto.setEmployeePositionName(positionNameMap.get(employee.getEmpPosition()));
                dto.setEmployeePositionSortOrder(positionSortMap.get(employee.getEmpPosition()));
            }
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
