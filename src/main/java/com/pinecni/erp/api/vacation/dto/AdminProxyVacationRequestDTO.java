package com.pinecni.erp.api.vacation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 관리자 대리 연차 신청 DTO
 * - 출장/외근 직군이 종이 또는 구두로 신청한 건을 관리자가 사후 기록할 때 사용
 * - 등록과 동시에 자동 승인 + 캘린더 일정 생성됨
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProxyVacationRequestDTO {

    /**
     * 대상 사용자 IDX (실제 연차를 사용하는 사람)
     */
    private Long targetUserIdx;

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
     * 일수 (프론트엔드 계산값, 서버에서 재검증)
     */
    private BigDecimal days;

    /**
     * 신청 사유
     */
    private String reason;
}
