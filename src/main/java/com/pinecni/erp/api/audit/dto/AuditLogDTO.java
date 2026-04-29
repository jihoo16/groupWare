package com.pinecni.erp.api.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 감사 로그 조회 응답 DTO — 관리자 페이지 테이블용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDTO {

    private Long idx;
    private LocalDateTime createdAt;

    // 행위자 (users JOIN)
    private Long userIdx;
    private String userEmpId;
    private String userName;
    private String userDeptName;

    // 대상/행위 (코드 + 한글명)
    private String targetType;
    private String targetTypeName;
    private Long targetIdx;
    private String action;
    private String actionName;

    private Long documentIdx;
    private String documentNo;       // 화면 표시용 문서번호 (예: VAC-20251218-001)
    private String description;
    private String detailJson;

    private String ipAddress;
    private String userAgent;
    private String requestUrl;
    private String requestMethod;
}
