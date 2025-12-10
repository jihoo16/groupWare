package com.pinecni.erp.api.document.service;

import com.pinecni.erp.entity.WeeklyReport;

import java.util.List;

/**
 * WeeklyReport Service Interface
 * 비즈니스 로직 메서드 정의
 */
public interface WeeklyReportService {

    /**
     * 주간업무보고 생성
     * @param weeklyReport 생성할 주간업무보고 엔터티
     * @return 저장된 주간업무보고 엔터티
     */
    WeeklyReport createWeeklyReport(WeeklyReport weeklyReport);

    /**
     * 전체 주간업무보고 목록 조회
     * @return 주간업무보고 목록 (생성일시 내림차순)
     */
    List<WeeklyReport> getAllWeeklyReport();

    /**
     * 주간업무보고 상세 조회
     * @param id 주간업무보고 ID
     * @return 주간업무보고 엔터티
     */
    WeeklyReport getWeeklyReportById(Long id);

}
