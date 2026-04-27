package com.pinecni.erp.api.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 감사 로그 페이지 응답 — content + 페이징 메타
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogPageResponse {
    private List<AuditLogDTO> content;
    private int page;           // 0-based
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
}
