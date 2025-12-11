package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.document.dto.MonthlyReportCreateDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportDTO;
import com.pinecni.erp.api.document.dto.MonthlyReportUpdateDTO;
import com.pinecni.erp.entity.MonthlyReport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * MonthlyReport Entity <-> DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class MonthlyReportMapper {

    /**
     * Entity -> DTO 변환
     * 월간업무보고 조회 시 사용
     */
    public MonthlyReportDTO toDTO(MonthlyReport entity) {
        if (entity == null) {
            return null;
        }

        return MonthlyReportDTO.builder()
                .id(entity.getId())
                .userIdx(entity.getUserIdx())
                .userName(null)  // TODO: User 테이블 JOIN하여 이름 조회
                .userDept(null)  // TODO: User 테이블 JOIN하여 부서 조회
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProjectName())
                .reportMonth(entity.getReportMonth())
                .mainTasks(entity.getMainTasks())
                .performance(entity.getPerformance())
                .improvements(entity.getImprovements())
                .nextMonthPlan(entity.getNextMonthPlan())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .build();
    }

    /**
     * CreateDTO -> Entity 변환
     * 월간업무보고 신규 생성 시 사용
     */
    public MonthlyReport toEntity(MonthlyReportCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        MonthlyReport report = MonthlyReport.builder()
                .userIdx(dto.getUserIdx())
                .projectIdx(dto.getProjectIdx())
                .projectName(dto.getProjectName())
                .reportMonth(dto.getReportMonth())
                .mainTasks(dto.getMainTasks())
                .performance(dto.getPerformance())
                .improvements(dto.getImprovements())
                .nextMonthPlan(dto.getNextMonthPlan())
                .build();

        // 타임스탬프는 Service에서 설정
        Instant now = Instant.now();
        report.setCreatedAt(now);
        report.setUpdatedAt(now);
        report.setCreatedUserIdx(dto.getUserIdx());

        return report;
    }

    /**
     * UpdateDTO로 기존 Entity 업데이트
     * 월간업무보고 수정 시 사용
     */
    public void updateEntity(MonthlyReport entity, MonthlyReportUpdateDTO dto, Long updatedUserIdx) {
        if (entity == null || dto == null) {
            return;
        }

        // null이 아닌 필드만 업데이트
        if (dto.getProjectIdx() != null) {
            entity.setProjectIdx(dto.getProjectIdx());
        }
        if (dto.getProjectName() != null) {
            entity.setProjectName(dto.getProjectName());
        }
        if (dto.getReportMonth() != null) {
            entity.setReportMonth(dto.getReportMonth());
        }
        if (dto.getMainTasks() != null) {
            entity.setMainTasks(dto.getMainTasks());
        }
        if (dto.getPerformance() != null) {
            entity.setPerformance(dto.getPerformance());
        }
        if (dto.getImprovements() != null) {
            entity.setImprovements(dto.getImprovements());
        }
        if (dto.getNextMonthPlan() != null) {
            entity.setNextMonthPlan(dto.getNextMonthPlan());
        }

        // 수정 정보 업데이트
        entity.setUpdatedAt(Instant.now());
        entity.setUpdatedUserIdx(updatedUserIdx);
    }
}
