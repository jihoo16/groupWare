package com.pinecni.erp.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 참여기간 검증 실패 시 충돌 상세 정보 DTO
 *
 * - NOT_ACTIVE_ON_DATE / NOT_ACTIVE_DURING:
 *   userIdx, userName, periodStart, periodEnd, requestedDate (또는 requestedStart/End) 필수
 *
 * - ORPHAN_DOCUMENT:
 *   userIdx, userName, documentTypePrefix, receiptIdx, documentDate 필수
 *   periodStart/periodEnd 는 새 기간(단축 후)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipationConflictDTO {

    /** 충돌 대상 사용자 IDX */
    private Long userIdx;

    /** 충돌 대상 사용자 이름 (UI 표시용) */
    private String userName;

    /** 해당 사용자의 (현재 또는 새) 참여 시작일 */
    private LocalDate periodStart;

    /** 해당 사용자의 (현재 또는 새) 참여 종료일 — null 가능 */
    private LocalDate periodEnd;

    /** 작성자가 입력한 단일 지출 날짜 (NOT_ACTIVE_ON_DATE) */
    private LocalDate requestedDate;

    /** 작성자가 입력한 기간 시작 (NOT_ACTIVE_DURING) */
    private LocalDate requestedStart;

    /** 작성자가 입력한 기간 종료 (NOT_ACTIVE_DURING) */
    private LocalDate requestedEnd;

    /** ORPHAN_DOCUMENT — 충돌 문서 타입 (RCM/RCT/RCO/RCTM) */
    private String documentTypePrefix;

    /** ORPHAN_DOCUMENT — 충돌 문서 IDX */
    private Long receiptIdx;

    /** ORPHAN_DOCUMENT — 충돌 문서의 실행 날짜 */
    private LocalDate documentDate;
}
