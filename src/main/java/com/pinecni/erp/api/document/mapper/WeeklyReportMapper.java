package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.document.dto.WeeklyReportCreateDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportDTO;
import com.pinecni.erp.api.document.dto.WeeklyReportUpdateDTO;
import com.pinecni.erp.entity.WeeklyReport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * WeeklyReport Entity <-> DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class WeeklyReportMapper {

    /**
     * Entity -> DTO 변환
     * 주간업무보고 조회 시 사용
     */
    public WeeklyReportDTO toDTO(WeeklyReport entity) {
        if (entity == null) {
            return null;
        }

        return WeeklyReportDTO.builder()
                .id(entity.getId())
                .userIdx(entity.getUserIdx())
                .userName(null)  // TODO: User 테이블 JOIN하여 이름 조회
                .userDept(null)  // TODO: User 테이블 JOIN하여 부서 조회
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProjectName())
                .reportPeriod(entity.getReportPeriod())
                .mainTasks(entity.getMainTasks())
                .achievements(entity.getAchievements())
                .issues(entity.getIssues())
                .nextWeekPlan(entity.getNextWeekPlan())
                .weeklyAchievementRate(entity.getWeeklyAchievementRate())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .build();
    }

    /**
     * CreateDTO -> Entity 변환
     * 주간업무보고 신규 생성 시 사용
     */
    public WeeklyReport toEntity(WeeklyReportCreateDTO dto) {
        if (dto == null) {
            return null;
        }

        WeeklyReport report = WeeklyReport.builder()
                .userIdx(dto.getUserIdx())
                .projectIdx(dto.getProjectIdx())
                .projectName(dto.getProjectName())
                .reportPeriod(dto.getReportPeriod())
                .mainTasks(dto.getMainTasks())
                .achievements(dto.getAchievements())
                .issues(dto.getIssues())
                .nextWeekPlan(dto.getNextWeekPlan())
                .weeklyAchievementRate(dto.getWeeklyAchievementRate())
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
     * 주간업무보고 수정 시 사용
     */
    public void updateEntity(WeeklyReport entity, WeeklyReportUpdateDTO dto, Long updatedUserIdx) {
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
        if (dto.getReportPeriod() != null) {
            entity.setReportPeriod(dto.getReportPeriod());
        }
        if (dto.getMainTasks() != null) {
            entity.setMainTasks(dto.getMainTasks());
        }
        if (dto.getAchievements() != null) {
            entity.setAchievements(dto.getAchievements());
        }
        if (dto.getIssues() != null) {
            entity.setIssues(dto.getIssues());
        }
        if (dto.getNextWeekPlan() != null) {
            entity.setNextWeekPlan(dto.getNextWeekPlan());
        }
        if (dto.getWeeklyAchievementRate() != null) {
            entity.setWeeklyAchievementRate(dto.getWeeklyAchievementRate());
        }

        // 수정 정보 업데이트
        entity.setUpdatedAt(Instant.now());
        entity.setUpdatedUserIdx(updatedUserIdx);
    }
}
