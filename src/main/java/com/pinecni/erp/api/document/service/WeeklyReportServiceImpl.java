package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.entity.WeeklyReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

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

    @Override
    public List<WeeklyReport> getAllWeeklyReport() {
        log.debug("getAllWeeklyReport() called");
        List<WeeklyReport> reports = weeklyReportRepository.findAllOrderByCreatedAtDesc();
        log.debug("Found {} weekly reports", reports.size());
        return reports;
    }

    @Override
    public WeeklyReport getWeeklyReportById(Long id) {
        log.debug("getWeeklyReportById() called - id: {}", id);
        WeeklyReport report = weeklyReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("주간업무보고를 찾을 수 없습니다. ID: " + id));
        log.debug("WeeklyReport found - id: {}", report.getId());
        return report;
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
