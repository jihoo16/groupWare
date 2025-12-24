package com.pinecni.erp.api.hierarchy.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.hierarchy.dto.HierarchyEmployeeDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyHistoryDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyStatsDTO;
import com.pinecni.erp.api.hierarchy.dto.HierarchyUpdateDTO;
import com.pinecni.erp.api.hierarchy.repository.ReportingHierarchyHistoryRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.ReportingHierarchyHistory;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 보고체계 관리 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HierarchyServiceImpl implements HierarchyService {

    private final UserRepository userRepository;
    private final ReportingHierarchyHistoryRepository historyRepository;
    private final CodeRepository codeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<HierarchyEmployeeDTO> getAllEmployeesHierarchy() {
        List<User> users = userRepository.findAllActive();

        return users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public HierarchyStatsDTO getHierarchyStats() {
        long totalEmployees = userRepository.findAllActive().size();
        long totalLeaders = userRepository.findActiveByIsTeamLeader(true).size();
        long completedCount = userRepository.countCompletedHierarchy();
        long incompleteCount = userRepository.countIncompleteHierarchy();

        return HierarchyStatsDTO.builder()
                .totalEmployees(totalEmployees)
                .totalLeaders(totalLeaders)
                .completedCount(completedCount)
                .incompleteCount(incompleteCount)
                .build();
    }

    @Override
    @Transactional
    public HierarchyEmployeeDTO updateEmployeeHierarchy(Long empIdx, HierarchyUpdateDTO updateDTO, Long currentUserIdx) {
        User user = userRepository.findById(empIdx)
                .orElseThrow(() -> new IllegalArgumentException("직원을 찾을 수 없습니다: " + empIdx));

        // 변경 이력 저장
        saveHistory(user, updateDTO, currentUserIdx);

        // 사용자 정보 업데이트
        if (updateDTO.getManagerIdx() != null) {
            user.setManagerIdx(updateDTO.getManagerIdx());
        }
        if (updateDTO.getManagerStartDate() != null) {
            user.setManagerStartDate(updateDTO.getManagerStartDate());
        }

        user.setUpdatedUserIdx(currentUserIdx);
        User savedUser = userRepository.save(user);

        return convertToDTO(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HierarchyHistoryDTO> getEmployeeHierarchyHistory(Long empIdx) {
        List<ReportingHierarchyHistory> histories = historyRepository.findByEmpIdxOrderByChangeDateDesc(empIdx);

        return histories.stream()
                .map(this::convertHistoryToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void bulkUpdateHierarchy(List<HierarchyUpdateDTO> updateDTOs, Long currentUserIdx) {
        for (HierarchyUpdateDTO updateDTO : updateDTOs) {
            updateEmployeeHierarchy(updateDTO.getEmpIdx(), updateDTO, currentUserIdx);
        }
    }

    /**
     * User Entity를 HierarchyEmployeeDTO로 변환
     */
    private HierarchyEmployeeDTO convertToDTO(User user) {
        String managerName = null;
        if (user.getManagerIdx() != null) {
            managerName = userRepository.findById(user.getManagerIdx())
                    .map(User::getEmpName)
                    .orElse(null);
        }

        // 부서 한글명 조회 (C01 그룹)
        String empDeptName = codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                .map(Code::getCodeName)
                .orElse(user.getEmpDept());

        // 직급 한글명 및 sortOrder 조회 (C02 그룹)
        Code positionCode = codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                .orElse(null);
        String empPositionName = positionCode != null ? positionCode.getCodeName() : user.getEmpPosition();
        Integer empPositionSortOrder = positionCode != null ? positionCode.getSortOrder() : Integer.MAX_VALUE;

        String status = user.getManagerIdx() != null ? "completed" : "incomplete";

        return HierarchyEmployeeDTO.builder()
                .idx(user.getIdx())
                .empId(user.getEmpId())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empDeptName(empDeptName)
                .empPosition(user.getEmpPosition())
                .empPositionName(empPositionName)
                .empPositionSortOrder(empPositionSortOrder)
                .isTeamLeader(user.getIsTeamLeader())
                .managerIdx(user.getManagerIdx())
                .managerName(managerName)
                .managerStartDate(user.getManagerStartDate())
                .status(status)
                .build();
    }

    /**
     * ReportingHierarchyHistory Entity를 HierarchyHistoryDTO로 변환
     */
    private HierarchyHistoryDTO convertHistoryToDTO(ReportingHierarchyHistory history) {
        String empName = userRepository.findById(history.getEmpIdx())
                .map(User::getEmpName)
                .orElse(null);

        String previousManagerName = history.getPreviousManagerIdx() != null
                ? userRepository.findById(history.getPreviousManagerIdx())
                .map(User::getEmpName)
                .orElse(null)
                : null;

        String newManagerName = history.getNewManagerIdx() != null
                ? userRepository.findById(history.getNewManagerIdx())
                .map(User::getEmpName)
                .orElse(null)
                : null;

        String changedByUserName = history.getChangedByUserIdx() != null
                ? userRepository.findById(history.getChangedByUserIdx())
                .map(User::getEmpName)
                .orElse(null)
                : null;

        return HierarchyHistoryDTO.builder()
                .idx(history.getIdx())
                .empIdx(history.getEmpIdx())
                .empName(empName)
                .previousManagerIdx(history.getPreviousManagerIdx())
                .previousManagerName(previousManagerName)
                .newManagerIdx(history.getNewManagerIdx())
                .newManagerName(newManagerName)
                .changeReason(history.getChangeReason())
                .changeDate(history.getChangeDate())
                .changedByUserIdx(history.getChangedByUserIdx())
                .changedByUserName(changedByUserName)
                .build();
    }

    /**
     * 보고체계 변경 이력 저장
     */
    private void saveHistory(User user, HierarchyUpdateDTO updateDTO, Long currentUserIdx) {
        ReportingHierarchyHistory history = ReportingHierarchyHistory.builder()
                .empIdx(user.getIdx())
                .previousManagerIdx(user.getManagerIdx())
                .newManagerIdx(updateDTO.getManagerIdx())
                .changeReason(updateDTO.getChangeReason())
                .changeDate(LocalDateTime.now())
                .changedByUserIdx(currentUserIdx)
                .build();

        history.setCreatedUserIdx(currentUserIdx);
        historyRepository.save(history);
    }
}
