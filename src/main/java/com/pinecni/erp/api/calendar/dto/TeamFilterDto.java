package com.pinecni.erp.api.calendar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 캘린더 필터용 팀 정보 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamFilterDto {

    /**
     * 팀 ID
     */
    private Long idx;

    /**
     * 팀 이름
     */
    private String teamName;

    /**
     * 팀 색상 (Hex 코드)
     */
    private String teamColor;

    /**
     * 해당 팀의 일정 개수
     */
    private Long eventCount;
}
