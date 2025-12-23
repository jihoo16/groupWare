package com.pinecni.erp.api.hierarchy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 보고체계 통계 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HierarchyStatsDTO {

    private Long totalEmployees;      // 전체 직원 수
    private Long totalLeaders;        // 팀장급 이상
    private Long completedCount;      // 설정 완료
    private Long incompleteCount;     // 미설정
}
