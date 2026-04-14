package com.pinecni.erp.api.approval.controller;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;
import com.pinecni.erp.api.approval.service.ApprovalDocumentService;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 전자 문서 통합 조회 Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/approval/documents")
@RequiredArgsConstructor
public class ApprovalDocumentController {

    private final ApprovalDocumentService approvalDocumentService;

    /**
     * 일반 전자결재 문서 목록 조회 (is_project = false)
     * - 연차신청서, 지출승인서 등 일반 전자결재 문서만 조회
     * - 연차신청서는 본인이 작성한 것만 조회
     * @param session HTTP 세션
     * @return 일반 문서 목록
     */
    @GetMapping
    public ResponseEntity<List<ApprovalDocumentDTO>> getAllDocuments(HttpSession session) {
        log.debug("GET /api/approval/documents - 일반 전자결재 문서 목록 조회");

        // 세션에서 현재 사용자 IDX 조회
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.warn("세션에 userIdx가 없습니다.");
            return ResponseEntity.status(401).build();
        }

        List<ApprovalDocumentDTO> documents = approvalDocumentService.getAllDocuments(currentUserIdx);

        log.debug("일반 전자결재 문서 목록 조회 완료 - 총 {}건", documents.size());
        return ResponseEntity.ok(documents);
    }

    /**
     * 프로젝트 문서 전체 목록 조회 (is_project = true)
     * - 프로젝트 주간보고, 연구비증빙 등 프로젝트 관련 문서만 조회
     * @return 프로젝트 문서 목록
     */
    @GetMapping("/projects")
    public ResponseEntity<List<ApprovalDocumentDTO>> getAllProjectDocuments() {
        log.debug("GET /api/approval/documents/projects - 프로젝트 문서 전체 조회");

        List<ApprovalDocumentDTO> documents = approvalDocumentService.getAllProjectDocuments();

        log.debug("프로젝트 문서 전체 조회 완료 - 총 {}건", documents.size());
        return ResponseEntity.ok(documents);
    }

    /**
     * 문서 타입별 목록 조회
     * @param documentType 문서 타입 (예: 주간업무보고, 월간업무보고, 회의록 등)
     * @return 필터링된 문서 목록
     */
    @GetMapping("/type/{documentType}")
    public ResponseEntity<List<ApprovalDocumentDTO>> getDocumentsByType(
            @PathVariable String documentType) {
        log.debug("GET /api/approval/documents/type/{} - 문서 타입별 조회", documentType);

        List<ApprovalDocumentDTO> documents = approvalDocumentService.getDocumentsByType(documentType);

        log.debug("문서 타입별 조회 완료 - 타입: {}, 총 {}건", documentType, documents.size());
        return ResponseEntity.ok(documents);
    }

    /**
     * 작성자별 문서 목록 조회
     * @param drafterUserIdx 작성자 사용자 IDX
     * @return 작성자의 문서 목록
     */
    @GetMapping("/drafter/{drafterUserIdx}")
    public ResponseEntity<List<ApprovalDocumentDTO>> getDocumentsByDrafter(
            @PathVariable Long drafterUserIdx) {
        log.debug("GET /api/approval/documents/drafter/{} - 작성자별 조회", drafterUserIdx);

        List<ApprovalDocumentDTO> documents = approvalDocumentService.getDocumentsByDrafter(drafterUserIdx);

        log.debug("작성자별 조회 완료 - userIdx: {}, 총 {}건", drafterUserIdx, documents.size());
        return ResponseEntity.ok(documents);
    }

    /**
     * 프로젝트별 문서 목록 조회
     * @param projectIdx 프로젝트 IDX
     * @param documentType 문서 타입 (선택) - WEEKLY_REPORT, MEETING_MINUTES, BUSINESS_TRIP, BUSINESS_TRIP_MEETING
     * @param documentTypes 복수 문서 타입 (선택, 콤마로 구분)
     * @return 프로젝트의 문서 목록
     */
    @GetMapping("/project/{projectIdx}")
    public ResponseEntity<List<ApprovalDocumentDTO>> getDocumentsByProject(
            @PathVariable Long projectIdx,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String documentTypes) {
        log.debug("GET /api/approval/documents/project/{} - 프로젝트별 조회, documentType: {}, documentTypes: {}",
                projectIdx, documentType, documentTypes);

        List<ApprovalDocumentDTO> documents;

        if (documentTypes != null && !documentTypes.isEmpty()) {
            // 복수 타입 조회
            String[] types = documentTypes.split(",");
            documents = approvalDocumentService.getDocumentsByProjectAndTypes(projectIdx, types);
        } else if (documentType != null && !documentType.isEmpty()) {
            // 단일 타입 조회
            documents = approvalDocumentService.getDocumentsByProjectAndType(projectIdx, documentType);
        } else {
            // 전체 조회
            documents = approvalDocumentService.getDocumentsByProject(projectIdx);
        }

        log.debug("프로젝트별 조회 완료 - projectIdx: {}, 총 {}건", projectIdx, documents.size());
        return ResponseEntity.ok(documents);
    }

    /**
     * [관리자 전용] 연구비증빙 6종 문서 월별 조회
     * - year/month 필터 (기본: 이번 달)
     * - 카드사용일자 내림차순 정렬
     * - 카드 정보 + 카드사용일자 포함
     * @param year 연도 (선택, 기본: 현재 연도)
     * @param month 월 (선택, 기본: 현재 월)
     * @param session HTTP 세션 (권한 체크용)
     * @return 연구비증빙 문서 목록
     */
    @GetMapping("/admin/receipts")
    public ResponseEntity<List<ApprovalDocumentDTO>> getAdminReceiptDocuments(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            HttpSession session) {

        // 대표(EXECUTIVE)도 읽기 전용으로 접근 가능
        if (!AuthorizationUtil.isExecutiveOrHigher(session)) {
            log.warn("권한 없는 사용자의 관리자 연구비증빙 조회 시도");
            return ResponseEntity.status(403).build();
        }

        LocalDate today = LocalDate.now();
        int y = year != null ? year : today.getYear();
        int m = month != null ? month : today.getMonthValue();

        log.debug("GET /api/approval/documents/admin/receipts - year: {}, month: {}", y, m);

        List<ApprovalDocumentDTO> documents = approvalDocumentService.getAdminReceiptDocuments(y, m);

        // 대표(EXECUTIVE) 필터 — 연구비증빙은 별도 제출/승인 워크플로우가 없고
        // 서비스 레벨에서 이미 삭제 제외됨. 추가 필터 기준(예: documentStatus) 이 필요하면 여기에 보강.

        log.debug("[관리자 연구비증빙 조회] 완료 - {}/{} 총 {}건", y, m, documents.size());
        return ResponseEntity.ok(documents);
    }
}
