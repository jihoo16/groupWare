package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MonthlyReportCreateDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.MonthlyReportMapper;
import com.pinecni.erp.api.document.repository.MonthlyReportRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.entity.MonthlyReport;
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

    @Override
    @Transactional
    public MonthlyReportDTO createMonthlyReport(MonthlyReportCreateDTO createDTO) {
        log.debug("createMonthlyReport() called - userIdx: {}", createDTO.getUserIdx());

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

        // 저장
        MonthlyReport saved = monthlyReportRepository.save(monthlyReport);
        log.debug("monthlyReport created successfully - id: {}", saved.getId());

        // Entity → DTO 변환
        return monthlyReportMapper.toDTO(saved);
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
        return monthlyReportMapper.toDTO(updated);
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

}
