package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.WeeklyReportMapper;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.entity.WeeklyReport;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ApprovalDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * WeeklyReport Service Implementation
 * 실제 비즈니스 로직 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WeeklyReportServiceImpl implements WeeklyReportService {

    private final WeeklyReportRepository weeklyReportRepository;
    private final WeeklyReportMapper weeklyReportMapper;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final ProjectRepository projectRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;

    @Override
    @Transactional
    public WeeklyReportDTO createWeeklyReport(WeeklyReportCreateDTO createDTO) {
        log.debug("createWeeklyReport() called - userIdx: {}", createDTO.getUserIdx());

        try {
            // DTO → Entity 변환
            WeeklyReport weeklyReport = weeklyReportMapper.toEntity(createDTO);

            // 생성 시간 설정
            LocalDateTime now = LocalDateTime.now();
            weeklyReport.setCreatedAt(now);
            weeklyReport.setUpdatedAt(now);

            // 생성자 정보 설정
            if (weeklyReport.getCreatedUserIdx() == null) {
                weeklyReport.setCreatedUserIdx(createDTO.getUserIdx());
            }

            // 프로젝트 달성률 업데이트 (inputProgressRate가 있고 projectIdx가 있는 경우)
            if (createDTO.getProjectIdx() != null && createDTO.getInputProgressRate() != null) {
                projectRepository.findById(createDTO.getProjectIdx()).ifPresent(project -> {
                    java.math.BigDecimal currentRate = project.getProgressRate() != null ?
                        project.getProgressRate() : java.math.BigDecimal.ZERO;
                    java.math.BigDecimal newRate = currentRate.add(createDTO.getInputProgressRate());
                    // 100%를 초과하지 않도록 제한
                    if (newRate.compareTo(new java.math.BigDecimal("100")) > 0) {
                        newRate = new java.math.BigDecimal("100");
                    }
                    project.setProgressRate(newRate);
                    project.setUpdatedAt(now);
                    project.setUpdatedUserIdx(createDTO.getUserIdx());
                    projectRepository.save(project);
                    log.debug("Project progressRate updated - projectIdx: {}, newRate: {}",
                        createDTO.getProjectIdx(), newRate);
                });
            }

            // === 1. ApprovalDocument 메타데이터 저장 ===
            String documentNo = "WEEKLY-" + System.currentTimeMillis() + "-" + createDTO.getUserIdx();
            String title = "주간업무보고";
            if (createDTO.getReportPeriod() != null && !createDTO.getReportPeriod().isEmpty()) {
                title = "주간업무보고 - " + createDTO.getReportPeriod();
            }

            ApprovalDocument approvalDocument = ApprovalDocument.builder()
                    .documentNo(documentNo)
                    .title(title)
                    .documentType("주간업무보고")
                    .drafterUserIdx(createDTO.getUserIdx())
                    .content(createDTO.getMainTasks())
                    .createdUserIdx(createDTO.getUserIdx())
                    .updatedUserIdx(createDTO.getUserIdx())
                    .build();

            ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                      savedDocument.getIdx(), savedDocument.getDocumentNo());

            // === 2. WeeklyReport에 documentIdx 연결 ===
            weeklyReport.setDocumentIdx(savedDocument.getIdx());

            // 저장
            WeeklyReport saved = weeklyReportRepository.save(weeklyReport);
            log.debug("WeeklyReport created successfully - id: {}, documentIdx: {}",
                      saved.getId(), saved.getDocumentIdx());

            // Entity → DTO 변환
            WeeklyReportDTO dto = weeklyReportMapper.toDTO(saved);
            // User 정보 조회 및 설정
            userRepository.findById(saved.getUserIdx()).ifPresent(user -> {
                dto.setUserName(user.getEmpName());
                dto.setUserDept(user.getEmpDept());
                // 부서 이름 조회
                if (user.getEmpDept() != null) {
                    codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                        dto.setUserDeptName(code.getCodeName());
                    });
                }
            });
            // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
            if (saved.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
                projectRepository.findById(saved.getProjectIdx()).ifPresent(project -> {
                    dto.setProjectName(project.getProjectName());
                });
            }
            return dto;

        } catch (Exception e) {
            log.error("주간업무보고 생성 실패 - userIdx: {}, error: {}", createDTO.getUserIdx(), e.getMessage(), e);
            throw new RuntimeException("주간업무보고 저장 중 오류가 발생했습니다. approval_documents와 weekly_report가 모두 롤백됩니다.", e);
        }
    }

    @Override
    public List<WeeklyReportDTO> getAllWeeklyReport() {
        log.debug("getAllWeeklyReport() called");
        List<WeeklyReport> reports = weeklyReportRepository.findAllOrderByCreatedAtDesc();
        log.debug("Found {} weekly reports", reports.size());

        // Entity List → DTO List 변환
        return reports.stream()
                .map(report -> {
                    WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
                    // User 정보 조회 및 설정
                    userRepository.findById(report.getUserIdx()).ifPresent(user -> {
                        dto.setUserName(user.getEmpName());
                        dto.setUserDept(user.getEmpDept());
                        // 부서 이름 조회
                        if (user.getEmpDept() != null) {
                            codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                                dto.setUserDeptName(code.getCodeName());
                            });
                        }
                    });
                    // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
                    if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
                        projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                            dto.setProjectName(project.getProjectName());
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public WeeklyReportDTO getWeeklyReportById(Long id) {
        log.debug("getWeeklyReportById() called - id: {}", id);
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));
        log.debug("WeeklyReport found - id: {}", report.getId());

        // Entity → DTO 변환
        WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
        // User 정보 조회 및 설정
        userRepository.findById(report.getUserIdx()).ifPresent(user -> {
            dto.setUserName(user.getEmpName());
            dto.setUserDept(user.getEmpDept());
            // 부서 이름 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setUserDeptName(code.getCodeName());
                });
            }
        });
        // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
        if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
            projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                dto.setProjectName(project.getProjectName());
            });
        }
        return dto;
    }

    @Override
    @Transactional
    public WeeklyReportDTO updateWeeklyReport(Long id, WeeklyReportUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateWeeklyReport() called - id: {}, updatedUserIdx: {}", id, updatedUserIdx);

        // 기존 Entity 조회
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));

        // UpdateDTO로 Entity 업데이트
        weeklyReportMapper.updateEntity(report, updateDTO, updatedUserIdx);

        // 프로젝트 달성률 업데이트 (inputProgressRate가 있고 projectIdx가 있는 경우)
        if (updateDTO.getProjectIdx() != null && updateDTO.getInputProgressRate() != null) {
            projectRepository.findById(updateDTO.getProjectIdx()).ifPresent(project -> {
                java.math.BigDecimal currentRate = project.getProgressRate() != null ?
                    project.getProgressRate() : java.math.BigDecimal.ZERO;
                java.math.BigDecimal newRate = currentRate.add(updateDTO.getInputProgressRate());
                // 100%를 초과하지 않도록 제한
                if (newRate.compareTo(new java.math.BigDecimal("100")) > 0) {
                    newRate = new java.math.BigDecimal("100");
                }
                project.setProgressRate(newRate);
                project.setUpdatedAt(LocalDateTime.now());
                project.setUpdatedUserIdx(updatedUserIdx);
                projectRepository.save(project);
                log.debug("Project progressRate updated - projectIdx: {}, newRate: {}",
                    updateDTO.getProjectIdx(), newRate);
            });
        }

        // 저장 (dirty checking에 의해 자동 업데이트)
        WeeklyReport updated = weeklyReportRepository.save(report);
        log.debug("WeeklyReport updated successfully - id: {}", updated.getId());

        // Entity → DTO 변환
        WeeklyReportDTO dto = weeklyReportMapper.toDTO(updated);
        // User 정보 조회 및 설정
        userRepository.findById(updated.getUserIdx()).ifPresent(user -> {
            dto.setUserName(user.getEmpName());
            dto.setUserDept(user.getEmpDept());
            // 부서 이름 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setUserDeptName(code.getCodeName());
                });
            }
        });
        return dto;
    }

    @Override
    @Transactional
    public void deleteWeeklyReport(Long id) {
        log.debug("deleteWeeklyReport() called - id: {}", id);

        // 존재 여부 확인
        if (!weeklyReportRepository.existsById(id)) {
            throw new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id);
        }

        weeklyReportRepository.deleteById(id);
        log.debug("WeeklyReport deleted successfully - id: {}", id);
    }

    @Override
    public List<WeeklyReportDTO> getWeeklyReportsByProjectIdx(Long projectIdx) {
        log.debug("getWeeklyReportsByProjectIdx() called - projectIdx: {}", projectIdx);

        List<WeeklyReport> reports = weeklyReportRepository.findByProjectIdx(projectIdx);
        log.debug("Found {} weekly reports for project {}", reports.size(), projectIdx);

        // Entity List → DTO List 변환
        return reports.stream()
                .map(report -> {
                    WeeklyReportDTO dto = weeklyReportMapper.toDTO(report);
                    // User 정보 조회 및 설정
                    userRepository.findById(report.getUserIdx()).ifPresent(user -> {
                        dto.setUserName(user.getEmpName());
                        dto.setUserDept(user.getEmpDept());
                        // 부서 이름 조회
                        if (user.getEmpDept() != null) {
                            codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                                dto.setUserDeptName(code.getCodeName());
                            });
                        }
                    });
                    // 프로젝트 이름 조회 (projectIdx가 있고 projectName이 없는 경우)
                    if (report.getProjectIdx() != null && (dto.getProjectName() == null || dto.getProjectName().isEmpty())) {
                        projectRepository.findById(report.getProjectIdx()).ifPresent(project -> {
                            dto.setProjectName(project.getProjectName());
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

}
