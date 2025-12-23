package com.pinecni.erp.api.vacation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 연차 신청서 저장 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationRequestSaveDTO {

    /**
     * 신청 사유
     */
    private String reason;

    /**
     * 마이너스 연차 허용 여부
     */
    private Boolean allowMinusVacation;

    /**
     * 특별 신청 사유 (마이너스 연차 사용 시)
     */
    private String specialApprovalReason;

    /**
     * 연차 기간 목록
     */
    private List<VacationPeriod> periods;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VacationPeriod {
        /**
         * 연차 유형 (연차, 반차(오전), 반차(오후))
         */
        private String vacationType;

        /**
         * 시작일
         */
        private LocalDate startDate;

        /**
         * 종료일
         */
        private LocalDate endDate;

        /**
         * 일수
         */
        private BigDecimal days;
    }
}
