package com.pinecni.erp.api.document.mapper;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesUpdateDTO;
import com.pinecni.erp.entity.MeetingsMinutes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class MeetingMinutesMapper {

    /**
     * CreateDTO -> Entity 변환
     * 회의록 조회 시 사용
     */
    public MeetingMinutesDTO toDTO(MeetingsMinutes entity) {
        if (entity == null) {
            return null;
        }
        return MeetingMinutesDTO.builder()
                .idx(entity.getId())
                .userIdx(entity.getUserIdx())
                .projectIdx(entity.getProjectIdx())
                .projectName(entity.getProjectName())
                .meetingTitle(entity.getMeetingTitle())
                .meetingDatetime(entity.getMeetingDatetime())
                .location(entity.getLocation())
                .participants(entity.getParticipants())
                .purpose(entity.getPurpose())
                .content(entity.getContent())
                .decisions(entity.getDecisions())
                .actionItems(entity.getActionItems())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdUserIdx(entity.getCreatedUserIdx())
                .updatedUserIdx(entity.getUpdatedUserIdx())
                .build();
    }

    /**
     * CreateDTO -> Entity 변환
     * 회의록 신규 생성 시 사용
     */
    public MeetingsMinutes toEntity(MeetingMinutesCreateDTO dto) {
        if (dto == null) {
            return null;
        }
        MeetingsMinutes report = MeetingsMinutes.builder()
                .userIdx(dto.getUserIdx())
                .projectIdx(dto.getProjectIdx())
                .projectName(dto.getProjectName())
                .meetingTitle(dto.getMeetingTitle())
                .meetingDatetime(dto.getMeetingDatetime())
                .location(dto.getLocation())
                .participants(dto.getParticipants())
                .purpose(dto.getPurpose())
                .content(dto.getContent())
                .decisions(dto.getDecisions())
                .actionItems(dto.getActionItems())
                .build();

        Instant now = Instant.now();
        report.setCreatedAt(now);
        report.setUpdatedAt(now);
        report.setCreatedUserIdx(dto.getUserIdx());
        return report;

    }

    /**
     * UpdateDTO로 Entity 업데이트
     * 회의록 수정 시 사용
     */
    public void updateEntity(MeetingsMinutes entity, MeetingMinutesUpdateDTO dto, Long updatedUserIdx) {
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
        if (dto.getMeetingTitle() != null) {
            entity.setMeetingTitle(dto.getMeetingTitle());
        }
        if (dto.getMeetingDatetime() != null) {
            entity.setMeetingDatetime(dto.getMeetingDatetime());
        }
        if (dto.getLocation() != null) {
            entity.setLocation(dto.getLocation());
        }
        if (dto.getParticipants() != null) {
            entity.setParticipants(dto.getParticipants());
        }
        if (dto.getPurpose() != null) {
            entity.setPurpose(dto.getPurpose());
        }
        if (dto.getContent() != null) {
            entity.setContent(dto.getContent());
        }
        if (dto.getDecisions() != null) {
            entity.setDecisions(dto.getDecisions());
        }
        if (dto.getActionItems() != null) {
            entity.setActionItems(dto.getActionItems());
        }

        // 수정 시간 및 수정자 업데이트
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setUpdatedUserIdx(updatedUserIdx);
    }

}
