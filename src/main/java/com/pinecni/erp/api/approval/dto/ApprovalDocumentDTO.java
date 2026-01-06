package com.pinecni.erp.api.approval.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 전자 문서 목록 조회용 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalDocumentDTO {
    private Long idx;
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
}
