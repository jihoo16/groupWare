package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.entity.WeeklyReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

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

    @Override
    @Transactional
    public WeeklyReport createWeeklyReport(WeeklyReport weeklyReport) {
        log.debug("createWeeklyReport() called - userIdx: {}", weeklyReport.getUserIdx());

        // 생성 시간 설정
        Instant now = Instant.now();
        weeklyReport.setCreatedAt(now);
        weeklyReport.setUpdatedAt(now);

        // 생성자 정보 설정 (userIdx와 동일하게)
        if (weeklyReport.getCreatedUserIdx() == null) {
            weeklyReport.setCreatedUserIdx(weeklyReport.getUserIdx());
        }

        WeeklyReport saved = weeklyReportRepository.save(weeklyReport);
        log.debug("WeeklyReport created successfully - id: {}", saved.getId());

        return saved;
    }


}
