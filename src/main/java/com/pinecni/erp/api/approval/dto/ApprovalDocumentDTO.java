package com.pinecni.erp.api.approval.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
    private String documentType;     // C04xx 코드값 (라우팅/로직용)
    private String documentTypeName; // 한글 표시명 (화면 렌더링용)
    private Long drafterUserIdx;
    private String drafterName;      // 작성자 이름
    private String drafterDept;       // 작성자 부서 코드
    private String drafterDeptName;   // 작성자 부서명
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDate eventDate;     // 실제 이벤트 날짜 (회의일자, 출장일자, 야근일자 등)
    private BigDecimal amount;       // 금액 (회의록, 출장, 야근식대 등)
    private String location;         // 장소 (출장지, 회의장소 등)
    private String purpose;          // 목적/내용 (회의목적, 품의내용 등)
    private String participantNames; // 참석자 이름 목록 (쉼표 구분)
    private Long projectIdx;         // 프로젝트 ID (프로젝트 문서인 경우)
    private String projectName;      // 프로젝트명 (프로젝트 문서인 경우)
    private List<AttachmentSummaryDTO> attachments;  // 첨부파일 요약 (회의록/야근식대/RCTM 전용)
    private Integer meetingSessionCount;             // 출장+회의 세션 수
    private List<Long> meetingSessionIds;            // 출장+회의 세션 PK 목록 (displayOrder 오름차순)
    private String statusCode;                       // 상태 코드 (지출승인서: C1001~C1005 등)
    private String statusName;                       // 상태 한글명
    private String paymentType;                      // 지급종류 (재료비/장비비: card, transfer)
    private Long cardIdx;                            // 카드 IDX (관리자 연구비증빙 페이지용)
    private String cardCompany;                      // 카드사명 (관리자 연구비증빙 페이지용)
    private String cardLastDigits;                   // 카드 뒷4자리 (관리자 연구비증빙 페이지용)
    private String cardNickname;                     // 카드 별칭 (관리자 연구비증빙 페이지용)
    private LocalDate cardUsageDate;                 // 카드사용일자 (관리자 연구비증빙 페이지 정렬용)
}
