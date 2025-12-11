package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.WeeklyReportMapper;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.entity.WeeklyReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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

    @Override
    @Transactional
    public WeeklyReportDTO createWeeklyReport(WeeklyReportCreateDTO createDTO) {
        log.debug("createWeeklyReport() called - userIdx: {}", createDTO.getUserIdx());

        // DTO → Entity 변환
        WeeklyReport weeklyReport = weeklyReportMapper.toEntity(createDTO);

        // 생성 시간 설정 (Mapper에서 이미 설정되지만 명시적으로 다시 설정)
        Instant now = Instant.now();
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
                .map(weeklyReportMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public WeeklyReportDTO getWeeklyReportById(Long id) {
        log.debug("getWeeklyReportById() called - id: {}", id);
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));
        log.debug("WeeklyReport found - id: {}", report.getId());

        // Entity → DTO 변환
        return weeklyReportMapper.toDTO(report);
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
