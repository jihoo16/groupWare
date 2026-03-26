package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MonthlyReportCreateDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.MonthlyReportMapper;
import com.pinecni.erp.api.document.repository.MonthlyReportRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.MonthlyReport;
import com.pinecni.erp.entity.ApprovalDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * MonthlyReport Service Implementation
 * 실제 비즈니스 로직 구현
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonthlyReportServiceImpl implements MonthlyReportService {

    private final MonthlyReportRepository monthlyReportRepository;
    private final MonthlyReportMapper monthlyReportMapper;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;

    @Override
    @Transactional
    public MonthlyReportDTO createMonthlyReport(MonthlyReportCreateDTO createDTO) {
        log.debug("createMonthlyReport() called - userIdx: {}", createDTO.getUserIdx());

        try {
            // DTO → Entity 변환
            MonthlyReport monthlyReport = monthlyReportMapper.toEntity(createDTO);

        // 생성 시간 설정 (Mapper에서 이미 설정되지만 명시적으로 다시 설정)
        LocalDateTime now = LocalDateTime.now();
        monthlyReport.setCreatedAt(now);
        monthlyReport.setUpdatedAt(now);

        // 생성자 정보 설정
        if (monthlyReport.getCreatedUserIdx() == null) {
            monthlyReport.setCreatedUserIdx(createDTO.getUserIdx());
        }

        // === 1. ApprovalDocument 메타데이터 저장 ===
        String documentNo = documentSequenceService.generateDocumentNumber(CodeConstants.DocumentType.MONTHLY_REPORT.getCode(), CodeConstants.DocumentType.MONTHLY_REPORT.getPrefix(), createDTO.getUserIdx());
        String title = CodeConstants.DocumentType.MONTHLY_REPORT.getName();
        if (createDTO.getReportMonth() != null && !createDTO.getReportMonth().isEmpty()) {
            title = CodeConstants.DocumentType.MONTHLY_REPORT.getName() + " - " + createDTO.getReportMonth();
        }

        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType(CodeConstants.DocumentType.MONTHLY_REPORT.getCode())
                .drafterUserIdx(createDTO.getUserIdx())
                .content(createDTO.getMainTasks())
                .createdUserIdx(createDTO.getUserIdx())
                .updatedUserIdx(createDTO.getUserIdx())
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
        log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                  savedDocument.getIdx(), savedDocument.getDocumentNo());

        // === 2. MonthlyReport에 documentIdx 연결 ===
        monthlyReport.setDocumentIdx(savedDocument.getIdx());

        // 저장
        MonthlyReport saved = monthlyReportRepository.save(monthlyReport);
        log.debug("monthlyReport created successfully - id: {}, documentIdx: {}",
                  saved.getId(), saved.getDocumentIdx());

            // Entity → DTO 변환
            MonthlyReportDTO dto = monthlyReportMapper.toDTO(saved);
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
            return dto;

        } catch (Exception e) {
            log.error("월간업무보고 생성 실패 - userIdx: {}, error: {}", createDTO.getUserIdx(), e.getMessage(), e);
            throw new RuntimeException("월간업무보고 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    public List<MonthlyReportDTO> getAllMonthlyReport() {
        log.debug("getAllmonthlyReport() called");
        List<MonthlyReport> reports = monthlyReportRepository.findAllOrderByCreatedAtDesc();
        log.debug("Found {} monthly reports", reports.size());

        // Entity List → DTO List 변환
        return reports.stream()
                .map(report -> {
                    MonthlyReportDTO dto = monthlyReportMapper.toDTO(report);
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
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public MonthlyReportDTO getMonthlyReportById(Long id) {
        log.debug("getMonthlyReportById() called - id: {}", id);
        MonthlyReport report = monthlyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("월간업무보고를 찾을 수 없습니다. ID: " + id));
        log.debug("MonthlyReport found - id: {}", report.getId());

        // Entity → DTO 변환
        MonthlyReportDTO dto = monthlyReportMapper.toDTO(report);
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
        return dto;
    }

    @Override
    @Transactional
    public MonthlyReportDTO updateMonthlyReport(Long id, MonthlyReportUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateMonthlyReport() called - id: {}, updatedUserIdx: {}", id, updatedUserIdx);

        // 기존 Entity 조회
        MonthlyReport report = monthlyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("월간업무보고를 찾을 수 없습니다. ID: " + id));

        // UpdateDTO로 Entity 업데이트
        monthlyReportMapper.updateEntity(report, updateDTO, updatedUserIdx);

        // 저장 (dirty checking에 의해 자동 업데이트)
        MonthlyReport updated = monthlyReportRepository.save(report);
        log.debug("MonthlyReport updated successfully - id: {}", updated.getId());

        // Entity → DTO 변환
        MonthlyReportDTO dto = monthlyReportMapper.toDTO(updated);
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
    public void deleteMonthlyReport(Long id) {
        log.debug("deleteMonthlyReport() called - id: {}", id);

        // 존재 여부 확인
        if (!monthlyReportRepository.existsById(id)) {
            throw new RuntimeException("월간업무보고를 찾을 수 없습니다. ID: " + id);
        }

        monthlyReportRepository.deleteById(id);
        log.debug("MonthlyReport deleted successfully - id: {}", id);
    }

    @Override
    public List<MonthlyReportDTO> getMonthlyReportsByProjectIdx(Long projectIdx) {
        log.debug("getMonthlyReportsByProjectIdx() called - projectIdx: {}", projectIdx);

        List<MonthlyReport> reports = monthlyReportRepository.findByProjectIdx(projectIdx);
        log.debug("Found {} monthly reports for project {}", reports.size(), projectIdx);

        // Entity List → DTO List 변환
        return reports.stream()
                .map(report -> {
                    MonthlyReportDTO dto = monthlyReportMapper.toDTO(report);
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
                    return dto;
                })
                .collect(Collectors.toList());
    }

}
