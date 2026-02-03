package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 연구비증빙 야근식대 생성 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOvertimeCreateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 카드 IDX
     */
    private Long cardIdx;

    /**
     * 작성자 IDX
     */
    private Long authorIdx;

    /**
     * 작성자 이름
     */
    private String authorName;

    /**
     * 야근 일자
     */
    private LocalDate overtimeDate;

    /**
     * 결재 일자
     */
    private LocalDate approvalDate;

    /**
     * 문서 제목
     */
    private String documentTitle;

    /**
     * 문서 내용
     */
    private String documentContent;

    /**
     * 총 금액
     */
    private BigDecimal totalAmount;

    /**
     * 지급종류 (card: 연구비카드, transfer: 연구비이체)
     */
    private String paymentType;

    /**
     * 야근 인원 목록
     */
    private List<ReceiptOvertimePersonDTO> persons;

    /**
     * 품의서 렌더링된 HTML (PDF 생성용)
     */
    private String approvalHtml;

    /**
     * 야근신청서 렌더링된 HTML (PDF 생성용)
     */
    private String overtimeHtml;

    /**
     * 렌더링된 CSS (PDF 생성용)
     */
    private String renderedCss;
}
