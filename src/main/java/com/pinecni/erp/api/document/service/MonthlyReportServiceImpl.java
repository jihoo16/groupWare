package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MonthlyReportCreateDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportUpdateDTO;
import com.pinecni.erp.api.document.mapper.MonthlyReportMapper;
import com.pinecni.erp.api.document.repository.MonthlyReportRepository;
import com.pinecni.erp.entity.MonthlyReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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

    @Override
    @Transactional
    public MonthlyReportDTO createMonthlyReport(MonthlyReportCreateDTO createDTO) {
        log.debug("createMonthlyReport() called - userIdx: {}", createDTO.getUserIdx());

        // DTO → Entity 변환
        MonthlyReport monthlyReport = monthlyReportMapper.toEntity(createDTO);

        // 생성 시간 설정 (Mapper에서 이미 설정되지만 명시적으로 다시 설정)
        Instant now = Instant.now();
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


}
