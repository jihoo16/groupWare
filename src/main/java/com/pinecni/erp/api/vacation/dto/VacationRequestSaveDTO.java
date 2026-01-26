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

    /**
     * 프론트엔드에서 렌더링된 HTML (PDF 생성용)
     */
    private String renderedHtml;

    /**
     * 프론트엔드에서 수집한 CSS (PDF 생성용)
     */
    private String renderedCss;

    /**
     * 기타 휴가 캘린더 등록 여부
     * - 기타 유형 연차만 해당
     * - true: 캘린더에 일정 등록, false: 등록하지 않음
     */
    private Boolean etcAddToCalendar;

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
