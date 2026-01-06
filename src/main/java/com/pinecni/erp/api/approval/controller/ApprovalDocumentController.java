package com.pinecni.erp.api.approval.controller;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;
import com.pinecni.erp.api.approval.service.ApprovalDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
     * 전체 문서 목록 조회 (모든 문서 타입 통합)
     * - 주간업무보고, 월간업무보고, 회의록, 연구비증빙, 연차신청서 등
     * @return 문서 목록
     */
    @GetMapping
    public ResponseEntity<List<ApprovalDocumentDTO>> getAllDocuments() {
        log.debug("GET /api/approval/documents - 전체 문서 목록 조회");

        List<ApprovalDocumentDTO> documents = approvalDocumentService.getAllDocuments();

        log.debug("전체 문서 목록 조회 완료 - 총 {}건", documents.size());
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
}
