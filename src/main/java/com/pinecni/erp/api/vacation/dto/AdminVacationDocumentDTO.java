package com.pinecni.erp.api.vacation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 관리자용 연차신청서 목록 조회 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminVacationDocumentDTO {

    // VacationRequest 정보
    private Long vacationIdx;
    private String vacationType;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal days;
    private String reason;

    // ApprovalDocument 정보
    private Long documentIdx;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;

    // User 정보
    private Long userIdx;
    private String userName;
    private String userDept;
    private String userDeptName;
    private String userPosition;

    // 관리자 승인 정보
    private Boolean isApproved;
    private LocalDateTime approvedAt;
    private Long approvedUserIdx;

    // 관리자 대리 등록 여부 (목록 배지 표시용)
    private Boolean isProxyRequest;
}
