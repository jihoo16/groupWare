package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;

import java.util.List;

/**
 * WeeklyReport Service Interface
 * 비즈니스 로직 메서드 정의
 */
public interface WeeklyReportService {

    /**
     * 주간업무보고 생성
     * @param createDTO 생성할 주간업무보고 정보
     * @return 저장된 주간업무보고 DTO
     */
    WeeklyReportDTO createWeeklyReport(WeeklyReportCreateDTO createDTO);

    /**
     * 전체 주간업무보고 목록 조회
     * @return 주간업무보고 DTO 목록 (생성일시 내림차순)
     */
    List<WeeklyReportDTO> getAllWeeklyReport();

    /**
     * 주간업무보고 상세 조회
     * @param id 주간업무보고 ID
     * @return 주간업무보고 DTO
     */
    WeeklyReportDTO getWeeklyReportById(Long id);

    /**
     * 주간업무보고 삭제
     * @param id 주간업무보고 ID
     */
    void deleteWeeklyReport(Long id);

    /**
     * 주간업무보고 수정
     * @param id 주간업무보고 ID
     * @param updateDTO 수정할 주간업무보고 정보
     * @param updatedUserIdx 수정자 IDX
     * @return 수정된 주간업무보고 DTO
     */
    WeeklyReportDTO updateWeeklyReport(Long id, WeeklyReportUpdateDTO updateDTO, Long updatedUserIdx);

    /**
     * 프로젝트별 주간업무보고 목록 조회
     * @param projectIdx 프로젝트 IDX
     * @return 주간업무보고 DTO 목록
     */
    List<WeeklyReportDTO> getWeeklyReportsByProjectIdx(Long projectIdx);

    /**
     * documentIdx로 주간업무보고 조회
     * @param documentIdx 결재 문서 IDX
     * @return 주간업무보고 DTO
     */
    WeeklyReportDTO getWeeklyReportByDocumentIdx(Long documentIdx);

    /**
     * documentIdx로 주간업무보고 삭제
     * @param documentIdx 결재 문서 IDX
     */
    void deleteWeeklyReportByDocumentIdx(Long documentIdx);

    /**
     * 이전 주 주간업무보고 조회 (지난주 차주계획 불러오기용)
     * @param projectIdx 프로젝트 IDX
     * @param prevWeekStartPattern 이전 주 시작일 패턴 (예: "2026.04.06")
     * @return 이전 주 주간업무보고 DTO, 없으면 null
     */
    WeeklyReportDTO getPrevWeekReport(Long projectIdx, String prevWeekStartPattern);
}
