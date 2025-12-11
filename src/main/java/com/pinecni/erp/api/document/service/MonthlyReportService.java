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

    /**
     * 전체 월간업무보고 목록 조회
     * @return 월간업무보고 DTO 목록 (생성일시 내림차순)
     */
    List<MonthlyReportDTO> getAllMonthlyReport();

    /**
     * 월간업무보고 상세 조회
     * @param id 월간업무보고 ID
     * @return 월간업무보고 DTO
     */
    MonthlyReportDTO getMonthlyReportById(Long id);

    /**
     * 월간업무보고 삭제
     * @param id 월간업무보고 ID
     */
    void deleteMonthlyReport(Long id);

    /**
     * 월간업무보고 수정
     * @param id 월간업무보고 ID
     * @param updateDTO 수정할 월간업무보고 정보
     * @param updatedUserIdx 수정자 IDX
     * @return 수정된 월간업무보고 DTO
     */
    MonthlyReportDTO updateMonthlyReport(Long id, MonthlyReportUpdateDTO updateDTO, Long updatedUserIdx);
}
