package com.pinecni.erp.api.hierarchy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 보고체계 변경 이력 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HierarchyHistoryDTO {

    private Long idx;
    private Long empIdx;
    private String empName;

    // 이전 값
    private Long previousManagerIdx;
    private String previousManagerName;

    // 새로운 값
    private Long newManagerIdx;
    private String newManagerName;

    // 변경 정보
    private String changeReason;
    private LocalDateTime changeDate;
    private Long changedByUserIdx;
    private String changedByUserName;
}
