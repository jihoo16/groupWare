package com.pinecni.erp.api.approval.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 전자 문서 목록 조회용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalDocumentDTO {
    private Long idx;                // approval_documents 테이블의 idx
    private Long sourceDocumentId;   // 원본 문서 테이블의 idx (weekly_report, monthly_report 등)
    private String documentNo;
    private String title;
    private String documentType;
    private Long drafterUserIdx;
    private String drafterName;      // 작성자 이름
    private String drafterDept;       // 작성자 부서 코드
    private String drafterDeptName;   // 작성자 부서명
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDate eventDate;     // 실제 이벤트 날짜 (회의일자, 출장일자, 야근일자 등)
}
