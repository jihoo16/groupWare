package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.signature.dto.DocumentSignatureResponse;
import com.pinecni.erp.api.signature.repository.ApprovalLineTemplateRepository;
import com.pinecni.erp.api.signature.repository.DocumentSignatureRepository;
import com.pinecni.erp.api.signature.repository.SignatureRequestRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.ApprovalLineTemplate;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.DocumentSignature;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.SignatureRequest;
import com.pinecni.erp.entity.User;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 서명 관리 서비스 구현체
 *
 * <p>주의: 문서별 참석자/프로젝트 조회는 Phase 3에서 각 문서 서비스와 연동.
 * 현재 구현은 DRAFTER, DEPT_HEAD, PROJECT_LEAD까지 지원.
 * ATTENDEE는 문서 생성 서비스가 직접 addAttendeeSignatures()를 호출하도록 설계.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SignatureServiceImpl implements SignatureService {

    private final ApprovalLineTemplateRepository approvalLineTemplateRepository;
    private final DocumentSignatureRepository documentSignatureRepository;
    private final SignatureRequestRepository signatureRequestRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final CodeRepository codeRepository;

    // ============================================================
    // 결재라인 기반 서명 요청 생성
    // ============================================================

    @Override
    @Transactional
    public void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx) {
        requestSignaturesForDocument(documentIdx, requesterUserIdx, null, null);
    }

    @Override
    @Transactional
    public void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx,
                                              Long projectIdx, List<Long> attendeeUserIdxList) {
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new EntityNotFoundException("문서를 찾을 수 없습니다: " + documentIdx));

        String documentType = document.getDocumentType();

        // 1. 결재라인 템플릿 조회
        List<ApprovalLineTemplate> templates = approvalLineTemplateRepository
                .findByDocumentTypeAndIsActiveTrueOrderBySignatureOrderAscSignatureSlotAsc(documentType);

        if (templates.isEmpty()) {
            log.info("결재라인 템플릿 없음 (서명 불필요): documentType={}, documentIdx={}",
                    documentType, documentIdx);
            return;
        }

        // 2. 각 슬롯별 서명자 결정 + document_signatures 행 생성
        // 같은 사람이 복수 슬롯에 걸릴 수 있으므로, 생성 후 linked 처리
        List<DocumentSignature> createdRows = new ArrayList<>();

        for (ApprovalLineTemplate template : templates) {
            List<Long> signerUserIdxList = resolveSigners(template, document, projectIdx, attendeeUserIdxList);

            if (signerUserIdxList.isEmpty()) {
                log.warn("서명자 결정 실패 (건너뜀): template={}, signer_role={}",
                        template.getIdx(), template.getSignerRole());
                continue;
            }

            for (Long signerIdx : signerUserIdxList) {
                // 중복 체크 (같은 문서+사용자+슬롯 UNIQUE)
                Optional<DocumentSignature> existing = documentSignatureRepository
                        .findByDocumentIdxAndSignerUserIdxAndSignatureSlot(
                                documentIdx, signerIdx, template.getSignatureSlot());
                if (existing.isPresent()) {
                    createdRows.add(existing.get());
                    continue;
                }

                DocumentSignature row = DocumentSignature.builder()
                        .documentIdx(documentIdx)
                        .signerUserIdx(signerIdx)
                        .signatureSlot(template.getSignatureSlot())
                        .signatureOrder(template.getSignatureOrder())
                        .status(CodeConstants.DocumentSignatureStatus.PENDING.getCode())
                        .createdUserIdx(requesterUserIdx)
                        .build();
                row = documentSignatureRepository.save(row);
                createdRows.add(row);
            }
        }

        // 3. 연동 서명 설정 (같은 사람이 복수 슬롯)
        // 하위 order 행의 linked_signature_idx = 상위 order 행의 idx
        // 단, is_auto_linked=TRUE인 하위 행만 연동
        Map<String, ApprovalLineTemplate> templateMap = new HashMap<>();
        for (ApprovalLineTemplate t : templates) {
            templateMap.put(t.getSignatureSlot(), t);
        }

        // 사용자별로 그룹화하여 같은 사람의 복수 슬롯 찾기
        Map<Long, List<DocumentSignature>> bySigner = new HashMap<>();
        for (DocumentSignature row : createdRows) {
            bySigner.computeIfAbsent(row.getSignerUserIdx(), k -> new ArrayList<>()).add(row);
        }

        for (Map.Entry<Long, List<DocumentSignature>> entry : bySigner.entrySet()) {
            List<DocumentSignature> rows = entry.getValue();
            if (rows.size() < 2) continue;

            // order 오름차순 정렬 후 가장 높은 order를 상위로, 나머지를 linked 처리
            rows.sort((a, b) -> Integer.compare(a.getSignatureOrder(), b.getSignatureOrder()));
            DocumentSignature topRow = rows.get(rows.size() - 1);  // 가장 높은 order

            for (int i = 0; i < rows.size() - 1; i++) {
                DocumentSignature lower = rows.get(i);
                ApprovalLineTemplate lowerTemplate = templateMap.get(lower.getSignatureSlot());
                if (lowerTemplate != null && Boolean.TRUE.equals(lowerTemplate.getIsAutoLinked())) {
                    lower.setLinkedSignatureIdx(topRow.getIdx());
                    documentSignatureRepository.save(lower);
                    log.info("연동 서명 설정: lowerIdx={} → topIdx={} (signer={})",
                            lower.getIdx(), topRow.getIdx(), entry.getKey());
                }
            }
        }

        // 4. order=1 중 linked 없는 행 활성화 + signature_requests 생성
        LocalDateTime now = LocalDateTime.now();
        for (DocumentSignature row : createdRows) {
            if (row.getSignatureOrder() == 1
                    && row.getLinkedSignatureIdx() == null
                    && row.getRequestedAt() == null) {
                row.setRequestedAt(now);
                documentSignatureRepository.save(row);

                // 알림용 signature_requests 생성
                SignatureRequest sr = SignatureRequest.builder()
                        .documentIdx(documentIdx)
                        .documentSignatureIdx(row.getIdx())
                        .requesterUserIdx(requesterUserIdx)
                        .signerUserIdx(row.getSignerUserIdx())
                        .isCompleted(false)
                        .build();
                signatureRequestRepository.save(sr);
            }
        }

        log.info("서명 요청 생성 완료: documentIdx={}, docType={}, createdRows={}",
                documentIdx, documentType, createdRows.size());
    }

    /**
     * signer_role별 실제 서명자 결정
     */
    private List<Long> resolveSigners(ApprovalLineTemplate template, ApprovalDocument document,
                                      Long projectIdx, List<Long> attendeeUserIdxList) {
        String role = template.getSignerRole();

        switch (role) {
            case "DRAFTER":
                if (document.getDrafterUserIdx() != null) {
                    return List.of(document.getDrafterUserIdx());
                }
                return List.of();

            case "DEPT_HEAD":
                if (document.getDrafterUserIdx() == null) return List.of();
                User drafter = userRepository.findById(document.getDrafterUserIdx()).orElse(null);
                if (drafter == null || drafter.getManagerIdx() == null) {
                    log.warn("기안자의 manager_idx 없음: drafterIdx={}", document.getDrafterUserIdx());
                    return List.of();
                }
                return List.of(drafter.getManagerIdx());

            case "PROJECT_LEAD":
                return resolveProjectLead(projectIdx);

            case "ATTENDEE":
                if (attendeeUserIdxList != null && !attendeeUserIdxList.isEmpty()) {
                    return attendeeUserIdxList;
                }
                log.info("ATTENDEE 결정: 참석자 목록이 전달되지 않음, docIdx={}", document.getIdx());
                return List.of();

            default:
                // SPECIFIC_USER:{userIdx} 형식
                if (role.startsWith("SPECIFIC_USER:")) {
                    try {
                        return List.of(Long.parseLong(role.substring("SPECIFIC_USER:".length())));
                    } catch (NumberFormatException e) {
                        log.warn("SPECIFIC_USER 파싱 실패: {}", role);
                    }
                }
                log.warn("알 수 없는 signer_role: {}", role);
                return List.of();
        }
    }

    private List<Long> resolveProjectLead(Long projectIdx) {
        if (projectIdx == null) {
            log.warn("PROJECT_LEAD 결정 실패: projectIdx가 전달되지 않음");
            return List.of();
        }
        return projectRepository.findById(projectIdx)
                .filter(p -> p.getProjectManagerIdx() != null)
                .map(p -> List.of(p.getProjectManagerIdx()))
                .orElseGet(() -> {
                    log.warn("PROJECT_LEAD 결정 실패: 프로젝트 또는 연구책임자 없음, projectIdx={}", projectIdx);
                    return List.of();
                });
    }

    // ============================================================
    // 순차 서명 단계 전진
    // ============================================================

    @Override
    @Transactional
    public void advanceToNextOrder(Long documentIdx, Integer currentOrder) {
        // 현재 단계의 linked 없는 행이 전원 완료인지 확인
        List<DocumentSignature> currentOrderRows = documentSignatureRepository
                .findByDocumentIdxAndSignatureOrderExcludingLinked(documentIdx, currentOrder);

        boolean allDone = currentOrderRows.stream().allMatch(ds ->
                CodeConstants.DocumentSignatureStatus.COMPLETED.getCode().equals(ds.getStatus())
                        || CodeConstants.DocumentSignatureStatus.SKIPPED.getCode().equals(ds.getStatus()));

        if (!allDone) {
            log.debug("현재 단계 미완료로 전진 중단: documentIdx={}, order={}", documentIdx, currentOrder);
            return;
        }

        // 문서 상태 → 서명진행중 (첫 서명 완료 시)
        updateDocumentStatus(documentIdx, CodeConstants.DocumentStatus.SIGN_IN_PROGRESS.getCode());

        // 다음 단계 행 찾기
        Integer nextOrder = currentOrder + 1;
        List<DocumentSignature> nextRows = documentSignatureRepository
                .findByDocumentIdxAndSignatureOrderExcludingLinked(documentIdx, nextOrder);

        if (nextRows.isEmpty()) {
            // 전자서명 전체 완료 → 서명완료 상태
            updateDocumentStatus(documentIdx, CodeConstants.DocumentStatus.SIGN_COMPLETE.getCode());
            log.info("전자서명 전체 완료: documentIdx={}", documentIdx);
            return;
        }

        // 다음 단계 활성화 (requested_at이 NULL인 것만, idempotent)
        LocalDateTime now = LocalDateTime.now();
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx).orElse(null);
        Long requesterIdx = document != null
                ? (document.getCreatedUserIdx() != null
                    ? document.getCreatedUserIdx() : document.getDrafterUserIdx())
                : null;

        for (DocumentSignature row : nextRows) {
            if (row.getRequestedAt() == null) {
                row.setRequestedAt(now);
                documentSignatureRepository.save(row);

                // signature_requests 생성 (중복 방지: 기존 없는 경우만)
                SignatureRequest sr = SignatureRequest.builder()
                        .documentIdx(documentIdx)
                        .documentSignatureIdx(row.getIdx())
                        .requesterUserIdx(requesterIdx != null ? requesterIdx : row.getSignerUserIdx())
                        .signerUserIdx(row.getSignerUserIdx())
                        .isCompleted(false)
                        .build();
                signatureRequestRepository.save(sr);
                log.info("다음 단계 활성화: documentIdx={}, order={}, signerUserIdx={}",
                        documentIdx, nextOrder, row.getSignerUserIdx());
            }
        }
    }

    private void updateDocumentStatus(Long documentIdx, String statusCode) {
        approvalDocumentRepository.findById(documentIdx).ifPresent(doc -> {
            doc.setStatus(statusCode);
            approvalDocumentRepository.save(doc);
            log.debug("문서 상태 전이: documentIdx={}, status={}", documentIdx, statusCode);
        });
    }

    // ============================================================
    // 게이트 / 잠금 검증
    // ============================================================

    @Override
    public boolean isAllSignaturesComplete(Long documentIdx) {
        return documentSignatureRepository.countPendingByDocumentIdx(documentIdx) == 0
                && documentSignatureRepository.findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx)
                        .stream().anyMatch(ds -> ds.getLinkedSignatureIdx() == null);
        // 설명: 서명 필요한 문서(linked 없는 행이 1개 이상)에서 미완료 행이 0개면 전체 완료
    }

    @Override
    public boolean hasAnySignatureCaptured(Long documentIdx) {
        return documentSignatureRepository.existsCompletedByDocumentIdx(documentIdx);
    }

    // ============================================================
    // 서명 현황 조회 (상세 페이지용)
    // ============================================================

    @Override
    public List<DocumentSignatureResponse> getDocumentSignatures(Long documentIdx, Long loginUserIdx) {
        List<DocumentSignature> rows = documentSignatureRepository
                .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx);

        List<DocumentSignatureResponse> result = new ArrayList<>();
        for (DocumentSignature row : rows) {
            User signer = userRepository.findById(row.getSignerUserIdx()).orElse(null);
            String signerName = signer != null ? signer.getEmpName() : "알 수 없음";
            String empId = signer != null ? signer.getEmpId() : null;
            String positionName = signer != null && signer.getEmpPosition() != null
                    ? codeRepository.findByGroupCodeAndCode(
                            CodeConstants.GroupCode.POSITION.getCode(), signer.getEmpPosition())
                            .map(Code::getCodeName).orElse("")
                    : "";

            String slotLabel = codeRepository.findByGroupCodeAndCode(
                    CodeConstants.GroupCode.SIGNATURE_SLOT.getCode(), row.getSignatureSlot())
                    .map(Code::getCodeName).orElse(row.getSignatureSlot());

            // 서명 이미지 Base64 변환 (완료된 경우만)
            String imageDataUrl = null;
            if (row.getSignatureImage() != null && row.getSignatureImage().length > 0) {
                imageDataUrl = "data:image/png;base64,"
                        + Base64.getEncoder().encodeToString(row.getSignatureImage());
            }

            // 서명 가능 여부: 로그인 사용자가 서명자 본인 + 차례 도래 + 미서명 + linked 아님
            boolean canSign = row.getSignerUserIdx().equals(loginUserIdx)
                    && row.getRequestedAt() != null
                    && row.getLinkedSignatureIdx() == null
                    && CodeConstants.DocumentSignatureStatus.PENDING.getCode().equals(row.getStatus());

            result.add(DocumentSignatureResponse.builder()
                    .idx(row.getIdx())
                    .signatureSlot(row.getSignatureSlot())
                    .signatureSlotLabel(slotLabel)
                    .signatureOrder(row.getSignatureOrder())
                    .signerUserIdx(row.getSignerUserIdx())
                    .signerEmpId(empId)
                    .signerName(signerName)
                    .signerPositionName(positionName)
                    .status(row.getStatus())
                    .linkedSignatureIdx(row.getLinkedSignatureIdx())
                    .requestedAt(row.getRequestedAt())
                    .signedAt(row.getSignedAt())
                    .signatureImageDataUrl(imageDataUrl)
                    .canSign(canSign)
                    .build());
        }
        return result;
    }
}
