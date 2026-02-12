package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 프로젝트 필터링용 DTO (문서함 필터에서 사용)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectFilterDTO {
    private Long idx;
    private String projectName;
    private String status;  // ACTIVE, COMPLETED, PAUSED
    private Integer documentCount;  // 해당 프로젝트의 총 문서 개수
}
