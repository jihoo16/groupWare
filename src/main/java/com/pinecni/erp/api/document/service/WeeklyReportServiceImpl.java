package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.WeeklyReportMapper;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.entity.WeeklyReport;
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

    @Override
    @Transactional
    public WeeklyReportDTO createWeeklyReport(WeeklyReportCreateDTO createDTO) {
        log.debug("createWeeklyReport() called - userIdx: {}", createDTO.getUserIdx());

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

        // 저장
        WeeklyReport saved = weeklyReportRepository.save(weeklyReport);
        log.debug("WeeklyReport created successfully - id: {}", saved.getId());

        // Entity → DTO 변환
        return weeklyReportMapper.toDTO(saved);
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

        // 저장 (dirty checking에 의해 자동 업데이트)
        WeeklyReport updated = weeklyReportRepository.save(report);
        log.debug("WeeklyReport updated successfully - id: {}", updated.getId());

        // Entity → DTO 변환
        return weeklyReportMapper.toDTO(updated);
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

}
