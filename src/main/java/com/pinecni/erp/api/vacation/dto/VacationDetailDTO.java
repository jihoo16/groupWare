package com.pinecni.erp.api.vacation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 연차신청서 상세 조회 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacationDetailDTO {

    // 문서 기본 정보
    private Long documentIdx;
    private String documentNo;
    private LocalDate applyDate;
    private Long drafterUserIdx;
    private String drafterName;
    private String drafterNameSpaced;
    private String drafterDept;
    private String drafterPosition;
    private String drafterAddress;
    private String drafterBirthDate;
    private String drafterPhone;
    private BigDecimal remainingDays;
    private String reason;
    private Boolean isApproved;
    private String statusCode;
    private String statusName;

    // 연차 기간 목록
    private List<PeriodDTO> periods;

    // 결재라인
    private List<ApproverDTO> approvers;

    // 첨부파일
    private List<AttachmentDTO> attachments;

    /**
     * 연차 기간 DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodDTO {
        private String vacationType;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal days;
    }

    /**
     * 결재자 DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApproverDTO {
        private Long userIdx;
        private String name;
        private String position;
        private String role;
    }

    /**
     * 첨부파일 DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentDTO {
        private Long idx;
        private String originalFileName;
        private Long fileSize;
    }
}
