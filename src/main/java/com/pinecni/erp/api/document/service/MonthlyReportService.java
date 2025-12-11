package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MonthlyReportCreateDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportUpdateDTO;

import java.util.List;

/**
 * MonthlyReport Service Interface
 * 비즈니스 로직 메서드 정의
 */
public interface MonthlyReportService {

    /**
     * 월간업무보고 생성
     * @param createDTO 생성할 월간업무보고 정보
     * @return 저장된 월간업무보고 DTO
     */
    MonthlyReportDTO createMonthlyReport(MonthlyReportCreateDTO createDTO);

}
