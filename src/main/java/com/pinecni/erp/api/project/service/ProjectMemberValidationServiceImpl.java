package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.repository.ProjectMemberRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ProjectMember;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.exception.ParticipationConflictDTO;
import com.pinecni.erp.exception.ParticipationPeriodException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 프로젝트 멤버 참여기간 검증 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemberValidationServiceImpl implements ProjectMemberValidationService {

    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public void validateActiveOn(Long projectIdx, List<Long> internalUserIdxList, LocalDate date) {
        if (projectIdx == null) {
            throw new IllegalArgumentException("projectIdx 가 필요합니다.");
        }
        if (date == null) {
            throw new IllegalArgumentException("검증 기준 날짜가 필요합니다.");
        }
        if (internalUserIdxList == null || internalUserIdxList.isEmpty()) {
            return;
        }

        // 한 사용자가 한 문서에 중복 등록되는 경우를 대비해 distinct 처리
        List<Long> distinctIdxList = internalUserIdxList.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIdxList.isEmpty()) {
            return;
        }

        // 해당 프로젝트의 모든 멤버 행을 한 번에 가져와서 메모리에서 매칭
        // (한 사용자가 두 개 기간으로 분리 등록되는 경우를 지원하기 위함)
        List<ProjectMember> allMembers = projectMemberRepository.findByProjectIdx(projectIdx);

        List<ParticipationConflictDTO> conflicts = new ArrayList<>();
        for (Long userIdx : distinctIdxList) {
            List<ProjectMember> rowsForUser = allMembers.stream()
                    .filter(m -> userIdx.equals(m.getEmployeeIdx()))
                    .toList();

            boolean active = rowsForUser.stream().anyMatch(m -> isRowActiveOn(m, date));
            if (active) {
                continue;
            }

            // 충돌 — 가장 가까운 멤버 행을 사용자 안내용으로 선택 (없으면 null 기간)
            ProjectMember closest = pickClosestRow(rowsForUser);
            conflicts.add(ParticipationConflictDTO.builder()
                    .userIdx(userIdx)
                    .userName(resolveUserName(userIdx))
                    .periodStart(closest != null ? closest.getParticipationStartDate() : null)
                    .periodEnd(closest != null ? closest.getParticipationEndDate() : null)
                    .requestedDate(date)
                    .build());
        }

        if (!conflicts.isEmpty()) {
            throw new ParticipationPeriodException(
                    "NOT_ACTIVE_ON_DATE",
                    buildSingleDateMessage(conflicts, date),
                    conflicts);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void validateActiveDuring(Long projectIdx, List<Long> internalUserIdxList,
                                     LocalDate startDate, LocalDate endDate) {
        if (projectIdx == null) {
            throw new IllegalArgumentException("projectIdx 가 필요합니다.");
        }
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("검증 기간 시작/종료 날짜가 모두 필요합니다.");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("종료 날짜가 시작 날짜보다 빠릅니다.");
        }
        if (internalUserIdxList == null || internalUserIdxList.isEmpty()) {
            return;
        }

        List<Long> distinctIdxList = internalUserIdxList.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIdxList.isEmpty()) {
            return;
        }

        List<ProjectMember> allMembers = projectMemberRepository.findByProjectIdx(projectIdx);

        List<ParticipationConflictDTO> conflicts = new ArrayList<>();
        for (Long userIdx : distinctIdxList) {
            List<ProjectMember> rowsForUser = allMembers.stream()
                    .filter(m -> userIdx.equals(m.getEmployeeIdx()))
                    .toList();

            // 전 기간 활성 — 단일 ProjectMember 행이 [startDate, endDate] 를 모두 포함해야 함
            // (한 사용자가 분리 등록된 경우, 어느 한 행이 전 기간을 커버해야 통과)
            boolean active = rowsForUser.stream().anyMatch(m -> isRowActiveDuring(m, startDate, endDate));
            if (active) {
                continue;
            }

            ProjectMember closest = pickClosestRow(rowsForUser);
            conflicts.add(ParticipationConflictDTO.builder()
                    .userIdx(userIdx)
                    .userName(resolveUserName(userIdx))
                    .periodStart(closest != null ? closest.getParticipationStartDate() : null)
                    .periodEnd(closest != null ? closest.getParticipationEndDate() : null)
                    .requestedStart(startDate)
                    .requestedEnd(endDate)
                    .build());
        }

        if (!conflicts.isEmpty()) {
            throw new ParticipationPeriodException(
                    "NOT_ACTIVE_DURING",
                    buildRangeMessage(conflicts, startDate, endDate),
                    conflicts);
        }
    }

    // ==============================================
    // 내부 헬퍼
    // ==============================================

    private boolean isRowActiveOn(ProjectMember m, LocalDate date) {
        if (!Boolean.TRUE.equals(m.getIsActive())) {
            return false;
        }
        LocalDate start = m.getParticipationStartDate();
        LocalDate end = m.getParticipationEndDate();
        if (start == null) {
            return false;
        }
        if (start.isAfter(date)) {
            return false;
        }
        return end == null || !end.isBefore(date);
    }

    private boolean isRowActiveDuring(ProjectMember m, LocalDate startDate, LocalDate endDate) {
        if (!Boolean.TRUE.equals(m.getIsActive())) {
            return false;
        }
        LocalDate start = m.getParticipationStartDate();
        LocalDate end = m.getParticipationEndDate();
        if (start == null) {
            return false;
        }
        if (start.isAfter(startDate)) {
            return false;
        }
        return end == null || !end.isBefore(endDate);
    }

    /**
     * 충돌 사용자에게 안내할 가장 대표성 있는 멤버 행 선택.
     * - 가장 최근에 등록된 행 (participationStartDate 가 가장 큰 행)
     */
    private ProjectMember pickClosestRow(List<ProjectMember> rowsForUser) {
        if (rowsForUser == null || rowsForUser.isEmpty()) {
            return null;
        }
        return rowsForUser.stream()
                .max((a, b) -> {
                    LocalDate sa = a.getParticipationStartDate();
                    LocalDate sb = b.getParticipationStartDate();
                    if (sa == null && sb == null) return 0;
                    if (sa == null) return -1;
                    if (sb == null) return 1;
                    return sa.compareTo(sb);
                })
                .orElse(null);
    }

    private String resolveUserName(Long userIdx) {
        if (userIdx == null) return null;
        return userRepository.findById(userIdx)
                .map(User::getEmpName)
                .orElse("(알 수 없음, IDX=" + userIdx + ")");
    }

    private String buildSingleDateMessage(List<ParticipationConflictDTO> conflicts, LocalDate date) {
        String names = conflicts.stream()
                .map(ParticipationConflictDTO::getUserName)
                .collect(Collectors.joining(", "));
        return String.format("다음 인원은 %s 에 본 프로젝트의 활성 참여연구원이 아닙니다: %s", date, names);
    }

    private String buildRangeMessage(List<ParticipationConflictDTO> conflicts,
                                     LocalDate startDate, LocalDate endDate) {
        String names = conflicts.stream()
                .map(ParticipationConflictDTO::getUserName)
                .collect(Collectors.joining(", "));
        return String.format("다음 인원은 %s ~ %s 전 기간에 본 프로젝트의 활성 참여연구원이 아닙니다: %s",
                startDate, endDate, names);
    }
}
