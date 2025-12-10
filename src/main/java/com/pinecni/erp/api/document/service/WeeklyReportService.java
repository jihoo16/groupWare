package com.pinecni.erp.api.document.service;

import com.pinecni.erp.entity.WeeklyReport;

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


}
