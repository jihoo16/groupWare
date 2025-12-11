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

}
