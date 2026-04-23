package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.externalperson.repository.ExternalPersonRepository;
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
import com.pinecni.erp.entity.ExternalPerson;
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
    private final ExternalPersonRepository externalPersonRepository;

    // ============================================================
    // 결재라인 기반 서명 요청 생성
    // ============================================================

    @Override
    @Transactional
    public void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx) {
        requestSignaturesForDocument(documentIdx, requesterUserIdx, null, null, null);
    }

    @Override
    @Transactional
    public void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx,
                                              Long projectIdx, List<Long> attendeeUserIdxList) {
        requestSignaturesForDocument(documentIdx, requesterUserIdx, projectIdx, attendeeUserIdxList, null);
    }

    @Override
    @Transactional
    public void requestSignaturesForDocument(Long documentIdx, Long requesterUserIdx,
                                              Long projectIdx,
                                              List<Long> attendeeUserIdxList,
                                              List<Long> externalAttendeeIdxList) {
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

            // ATTENDEE 템플릿은 내부 참석자가 없어도 외부 참석자 처리를 위해 계속 진행
            boolean hasExternalForThisSlot = "ATTENDEE".equals(template.getSignerRole())
                    && externalAttendeeIdxList != null && !externalAttendeeIdxList.isEmpty();
            if (signerUserIdxList.isEmpty() && !hasExternalForThisSlot) {
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
                        .isExternal(false)
                        .build();
                row = documentSignatureRepository.save(row);
                createdRows.add(row);
            }

            // 외부 참석자: ATTENDEE 슬롯에 대해 별도로 is_external=true row 생성
            // (사번이 없어 인증 스킵, external_person.idx를 signer_user_idx로 사용)
            if ("ATTENDEE".equals(template.getSignerRole())
                    && externalAttendeeIdxList != null && !externalAttendeeIdxList.isEmpty()) {
                for (Long externalPersonIdx : externalAttendeeIdxList) {
                    if (externalPersonIdx == null) continue;
                    Optional<DocumentSignature> existing = documentSignatureRepository
                            .findByDocumentIdxAndSignerUserIdxAndSignatureSlot(
                                    documentIdx, externalPersonIdx, template.getSignatureSlot());
                    if (existing.isPresent()) {
                        createdRows.add(existing.get());
                        continue;
                    }
                    DocumentSignature row = DocumentSignature.builder()
                            .documentIdx(documentIdx)
                            .signerUserIdx(externalPersonIdx)
                            .signatureSlot(template.getSignatureSlot())
                            .signatureOrder(template.getSignatureOrder())
                            .status(CodeConstants.DocumentSignatureStatus.PENDING.getCode())
                            .createdUserIdx(requesterUserIdx)
                            .isExternal(true)
                            .build();
                    row = documentSignatureRepository.save(row);
                    createdRows.add(row);
                }
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
        // 외부인은 linking 대상 제외 (한 슬롯만 가지며, external_person.idx ↔ users.idx 충돌 방지)
        Map<Long, List<DocumentSignature>> bySigner = new HashMap<>();
        for (DocumentSignature row : createdRows) {
            if (Boolean.TRUE.equals(row.getIsExternal())) continue;
            bySigner.computeIfAbsent(row.getSignerUserIdx(), k -> new ArrayList<>()).add(row);
        }

        for (Map.Entry<Long, List<DocumentSignature>> entry : bySigner.entrySet()) {
            List<DocumentSignature> rows = entry.getValue();
            if (rows.size() < 2) continue;

            // 1차: order 오름차순 — 낮은 order(먼저 서명할 단계)가 메인
            // 2차: 같은 order일 때 슬롯 우선순위 — 정식 결재란이 메인, 참석자 행은 부(副)
            //      DRAFTER(C1602) > DEPT_HEAD(C1604) > PROJECT_LEAD(C1603) > ATTENDEE(C1601)
            //      (신청자가 참석자도 겸한 경우, 결재란 상단을 클릭해 서명하게끔 UX 정렬)
            rows.sort((a, b) -> {
                int orderCmp = Integer.compare(a.getSignatureOrder(), b.getSignatureOrder());
                if (orderCmp != 0) return orderCmp;
                return Integer.compare(slotPriority(a.getSignatureSlot()), slotPriority(b.getSignatureSlot()));
            });
            DocumentSignature mainRow = rows.get(0);  // 가장 낮은 order + 높은 슬롯 우선순위 = 메인

            for (int i = 1; i < rows.size(); i++) {
                DocumentSignature later = rows.get(i);
                ApprovalLineTemplate laterTemplate = templateMap.get(later.getSignatureSlot());
                // auto_linked 여부는 나중 슬롯 OR 먼저 슬롯 중 하나라도 TRUE면 연동
                ApprovalLineTemplate mainTemplate = templateMap.get(mainRow.getSignatureSlot());
                boolean shouldLink = (laterTemplate != null && Boolean.TRUE.equals(laterTemplate.getIsAutoLinked()))
                        || (mainTemplate != null && Boolean.TRUE.equals(mainTemplate.getIsAutoLinked()));
                if (shouldLink) {
                    later.setLinkedSignatureIdx(mainRow.getIdx());
                    documentSignatureRepository.save(later);
                    log.info("연동 서명 설정: laterIdx={} → mainIdx={} (signer={})",
                            later.getIdx(), mainRow.getIdx(), entry.getKey());
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

                // 알림용 signature_requests 생성 — 외부인은 로그인 대상 아니라 알림 대상 아님.
                //   external_person.idx ↔ users.idx 숫자 충돌 시 다른 사용자 알림에 섞일 위험도 있어 스킵.
                if (!Boolean.TRUE.equals(row.getIsExternal())) {
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
                // 문서의 공식 작성자 (drafterUserIdx) 기준 — 서명칸에 이름이 표시되는 사람
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

    /**
     * 같은 order에 여러 슬롯이 있을 때 어느 슬롯을 "메인(직접 서명)"으로 삼을지 결정.
     * 낮을수록 우선. 결재란 상단(DRAFTER/DEPT_HEAD/PROJECT_LEAD)이 참석자 행(ATTENDEE)보다 우선.
     */
    private int slotPriority(String slot) {
        if (slot == null) return 9;
        switch (slot) {
            case "C1602": return 0; // DRAFTER (신청자/담당)
            case "C1604": return 1; // DEPT_HEAD (부서장)
            case "C1603": return 2; // PROJECT_LEAD (연구책임자)
            case "C1601": return 3; // ATTENDEE (참석자 — 결재란 있으면 후순위)
            default:      return 9;
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

        log.info("advanceToNextOrder 시작: documentIdx={}, order={}, rows={}",
                documentIdx, currentOrder, currentOrderRows.size());
        for (DocumentSignature ds : currentOrderRows) {
            log.info("  → dsIdx={}, signerUserIdx={}, status={}", ds.getIdx(), ds.getSignerUserIdx(), ds.getStatus());
        }

        boolean allDone = currentOrderRows.stream().allMatch(ds ->
                CodeConstants.DocumentSignatureStatus.COMPLETED.getCode().equals(ds.getStatus())
                        || CodeConstants.DocumentSignatureStatus.SKIPPED.getCode().equals(ds.getStatus()));

        if (!allDone) {
            log.warn("현재 단계 미완료로 전진 중단: documentIdx={}, order={}", documentIdx, currentOrder);
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

                // 외부인은 로그인 대상 아니라 알림 요청 스킵 (숫자 충돌 방지)
                if (Boolean.TRUE.equals(row.getIsExternal())) {
                    log.info("다음 단계 외부인 활성화 (알림 스킵): documentIdx={}, signerUserIdx={}",
                            documentIdx, row.getSignerUserIdx());
                    continue;
                }

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
            String prev = doc.getStatus();
            doc.setStatus(statusCode);
            approvalDocumentRepository.saveAndFlush(doc);
            log.info("문서 상태 전이: documentIdx={}, {} → {}", documentIdx, prev, statusCode);
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
            boolean isExternal = Boolean.TRUE.equals(row.getIsExternal());

            String signerName;
            String empId = null;
            String positionName = "";
            String signerCompany = null;

            if (isExternal) {
                // 외부인: external_person 조회
                ExternalPerson ep = externalPersonRepository.findById(row.getSignerUserIdx()).orElse(null);
                signerName = ep != null ? ep.getName() : "외부 인원";
                positionName = ep != null && ep.getPosition() != null ? ep.getPosition() : "";
                signerCompany = ep != null ? ep.getCompanyName() : null;
            } else {
                User signer = userRepository.findById(row.getSignerUserIdx()).orElse(null);
                signerName = signer != null ? signer.getEmpName() : "알 수 없음";
                empId = signer != null ? signer.getEmpId() : null;
                positionName = signer != null && signer.getEmpPosition() != null
                        ? codeRepository.findByGroupCodeAndCode(
                                CodeConstants.GroupCode.POSITION.getCode(), signer.getEmpPosition())
                                .map(Code::getCodeName).orElse("")
                        : "";
            }

            String slotLabel = codeRepository.findByGroupCodeAndCode(
                    CodeConstants.GroupCode.SIGNATURE_SLOT.getCode(), row.getSignatureSlot())
                    .map(Code::getCodeName).orElse(row.getSignatureSlot());

            // 서명 이미지 Base64 변환 (완료된 경우만)
            String imageDataUrl = null;
            if (row.getSignatureImage() != null && row.getSignatureImage().length > 0) {
                imageDataUrl = "data:image/png;base64,"
                        + Base64.getEncoder().encodeToString(row.getSignatureImage());
            }

            // 서명 가능 여부:
            //  - 내부: 로그인 사용자 == 서명자 본인 + 차례 + 미서명 + linked 아님
            //  - 외부: 로그인 사용자 무관(누구나 QR 발급 가능) + 차례 + 미서명 + linked 아님
            boolean baseCanSign = row.getRequestedAt() != null
                    && row.getLinkedSignatureIdx() == null
                    && CodeConstants.DocumentSignatureStatus.PENDING.getCode().equals(row.getStatus());
            boolean canSign = isExternal
                    ? baseCanSign
                    : baseCanSign && row.getSignerUserIdx().equals(loginUserIdx);

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
                    .isExternal(isExternal)
                    .signerCompany(signerCompany)
                    .build());
        }
        return result;
    }

    // ============================================================
    // 홈 대시보드 위젯
    // ============================================================

    @Override
    public long countPendingForUser(Long userIdx) {
        // 삭제된 문서 제외 — list와 동일한 기준
        return documentSignatureRepository.findPendingBySignerUserIdx(userIdx).stream()
                .filter(ds -> {
                    ApprovalDocument doc = approvalDocumentRepository.findById(ds.getDocumentIdx()).orElse(null);
                    return doc != null && doc.getDeletedAt() == null;
                })
                .count();
    }

    @Override
    public List<Map<String, Object>> getPendingListForUser(Long userIdx) {
        List<DocumentSignature> rows = documentSignatureRepository
                .findPendingBySignerUserIdx(userIdx);

        List<Map<String, Object>> result = new ArrayList<>();
        for (DocumentSignature ds : rows) {
            ApprovalDocument doc = approvalDocumentRepository.findById(ds.getDocumentIdx()).orElse(null);
            if (doc == null || doc.getDeletedAt() != null) continue;

            String slotLabel = codeRepository.findByCode(ds.getSignatureSlot())
                    .map(Code::getCodeName).orElse(ds.getSignatureSlot());
            String docTypeName = codeRepository.findByCode(doc.getDocumentType())
                    .map(Code::getCodeName).orElse(doc.getDocumentType());

            String drafterName = "";
            if (doc.getDrafterUserIdx() != null) {
                drafterName = userRepository.findById(doc.getDrafterUserIdx())
                        .map(User::getEmpName).orElse("");
            }

            Map<String, Object> item = new HashMap<>();
            item.put("documentSignatureIdx", ds.getIdx());
            item.put("documentIdx", ds.getDocumentIdx());
            item.put("documentNo", doc.getDocumentNo());
            item.put("documentTitle", doc.getTitle());
            item.put("documentType", doc.getDocumentType());
            item.put("documentTypeName", docTypeName);
            item.put("signatureSlot", ds.getSignatureSlot());
            item.put("signatureSlotLabel", slotLabel);
            item.put("drafterName", drafterName);
            item.put("requestedAt", ds.getRequestedAt());
            // 문서 상태
            String statusCode = doc.getStatus() != null ? doc.getStatus() : "C0501";
            String statusName;
            try { statusName = CodeConstants.DocumentStatus.fromCode(statusCode).getName(); }
            catch (Exception e) { statusName = statusCode; }
            item.put("statusCode", statusCode);
            item.put("statusName", statusName);

            // 전체 서명 현황
            List<DocumentSignature> allSigs = documentSignatureRepository
                    .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(ds.getDocumentIdx());
            long total = allSigs.stream().filter(s -> s.getLinkedSignatureIdx() == null).count();
            long signed = allSigs.stream().filter(s -> s.getLinkedSignatureIdx() == null
                    && ("C1402".equals(s.getStatus()) || "C1403".equals(s.getStatus()))).count();
            item.put("progress", total > 0 ? signed + "/" + total : "-");

            List<Map<String, Object>> signerDetails = new ArrayList<>();
            for (DocumentSignature sig : allSigs) {
                if (sig.getLinkedSignatureIdx() != null) continue;
                String sName = userRepository.findById(sig.getSignerUserIdx())
                        .map(User::getEmpName).orElse("알 수 없음");
                String sSlot = codeRepository.findByCode(sig.getSignatureSlot())
                        .map(Code::getCodeName).orElse(sig.getSignatureSlot());
                Map<String, Object> sd = new HashMap<>();
                sd.put("signerName", sName);
                sd.put("slotLabel", sSlot);
                sd.put("signed", "C1402".equals(sig.getStatus()) || "C1403".equals(sig.getStatus()));
                sd.put("requestedAt", sig.getRequestedAt());
                sd.put("signedAt", sig.getSignedAt());
                signerDetails.add(sd);
            }
            item.put("signers", signerDetails);

            result.add(item);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getCompletedListForUser(Long userIdx) {
        List<DocumentSignature> rows = documentSignatureRepository
                .findCompletedBySignerUserIdx(userIdx);

        List<Map<String, Object>> result = new ArrayList<>();
        for (DocumentSignature ds : rows) {
            ApprovalDocument doc = approvalDocumentRepository.findById(ds.getDocumentIdx()).orElse(null);
            if (doc == null) continue;

            String slotLabel = codeRepository.findByCode(ds.getSignatureSlot())
                    .map(Code::getCodeName).orElse(ds.getSignatureSlot());
            String docTypeName = codeRepository.findByCode(doc.getDocumentType())
                    .map(Code::getCodeName).orElse(doc.getDocumentType());

            String drafterName = "";
            if (doc.getDrafterUserIdx() != null) {
                drafterName = userRepository.findById(doc.getDrafterUserIdx())
                        .map(User::getEmpName).orElse("");
            }

            Map<String, Object> item = new HashMap<>();
            item.put("documentIdx", ds.getDocumentIdx());
            item.put("documentNo", doc.getDocumentNo());
            item.put("documentTitle", doc.getTitle());
            item.put("documentType", doc.getDocumentType());
            item.put("documentTypeName", docTypeName);
            item.put("signatureSlot", ds.getSignatureSlot());
            item.put("signatureSlotLabel", slotLabel);
            item.put("drafterName", drafterName);
            item.put("signedAt", ds.getSignedAt());
            String statusCode = doc.getStatus() != null ? doc.getStatus() : "C0501";
            String statusName;
            try { statusName = CodeConstants.DocumentStatus.fromCode(statusCode).getName(); }
            catch (Exception e) { statusName = statusCode; }
            item.put("statusCode", statusCode);
            item.put("statusName", statusName);
            result.add(item);
        }
        return result;
    }

    // ============================================================
    // 일괄 서명
    // ============================================================

    @Override
    @Transactional
    public int bulkApplySignature(Long userIdx, List<Long> documentSignatureIdxList, String signatureImageBase64) {
        byte[] imageBytes;
        try {
            String base64Data = signatureImageBase64.contains(",")
                    ? signatureImageBase64.substring(signatureImageBase64.indexOf(",") + 1)
                    : signatureImageBase64;
            imageBytes = Base64.getDecoder().decode(base64Data);
        } catch (Exception e) {
            throw new IllegalArgumentException("서명 이미지 디코딩 실패");
        }

        LocalDateTime now = LocalDateTime.now();
        int applied = 0;

        for (Long dsIdx : documentSignatureIdxList) {
            DocumentSignature ds = documentSignatureRepository.findById(dsIdx).orElse(null);
            if (ds == null) continue;

            // 본인 서명칸만 처리
            if (!ds.getSignerUserIdx().equals(userIdx)) continue;
            // 이미 완료된 건 스킵
            if (!CodeConstants.DocumentSignatureStatus.PENDING.getCode().equals(ds.getStatus())) continue;
            // linked 슬롯 스킵
            if (ds.getLinkedSignatureIdx() != null) continue;
            // 차례 도래 확인
            if (ds.getRequestedAt() == null) continue;

            // 서명 적용
            ds.setStatus(CodeConstants.DocumentSignatureStatus.COMPLETED.getCode());
            ds.setSignatureImage(imageBytes);
            ds.setSignedAt(now);
            documentSignatureRepository.saveAndFlush(ds);

            // 연동 서명 자동 완료
            List<DocumentSignature> linkedRows = documentSignatureRepository.findByLinkedSignatureIdx(ds.getIdx());
            for (DocumentSignature linked : linkedRows) {
                linked.setStatus(CodeConstants.DocumentSignatureStatus.COMPLETED.getCode());
                linked.setSignatureImage(imageBytes);
                linked.setSignedAt(now);
                documentSignatureRepository.saveAndFlush(linked);
            }

            // 순차 서명 전진
            advanceToNextOrder(ds.getDocumentIdx(), ds.getSignatureOrder());

            applied++;
            log.info("일괄 서명 적용: dsIdx={}, documentIdx={}, slot={}", dsIdx, ds.getDocumentIdx(), ds.getSignatureSlot());
        }

        return applied;
    }

    // ============================================================
    // 내가 요청한 서명 목록
    // ============================================================

    @Override
    public List<Map<String, Object>> getRequestedListForUser(Long userIdx) {
        // 내가 만든 문서(createdUserIdx) 중 서명 요청이 있는 것
        List<ApprovalDocument> myDocs = approvalDocumentRepository.findAll().stream()
                .filter(d -> userIdx.equals(d.getCreatedUserIdx()) && d.getDeletedAt() == null
                        && d.getStatus() != null)
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (ApprovalDocument doc : myDocs) {
            List<DocumentSignature> sigs = documentSignatureRepository
                    .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(doc.getIdx());
            if (sigs.isEmpty()) continue;

            long total = sigs.stream().filter(s -> s.getLinkedSignatureIdx() == null).count();
            long signed = sigs.stream().filter(s -> s.getLinkedSignatureIdx() == null
                    && ("C1402".equals(s.getStatus()) || "C1403".equals(s.getStatus()))).count();

            String docTypeName = codeRepository.findByCode(doc.getDocumentType())
                    .map(Code::getCodeName).orElse(doc.getDocumentType());
            String statusCode = doc.getStatus();
            String statusName;
            try { statusName = CodeConstants.DocumentStatus.fromCode(statusCode).getName(); }
            catch (Exception e) { statusName = statusCode; }

            Map<String, Object> item = new HashMap<>();
            item.put("documentIdx", doc.getIdx());
            item.put("documentNo", doc.getDocumentNo());
            item.put("documentTitle", doc.getTitle());
            item.put("documentType", doc.getDocumentType());
            item.put("documentTypeName", docTypeName);
            item.put("statusCode", statusCode);
            item.put("statusName", statusName);
            item.put("signedCount", signed);
            item.put("totalCount", total);
            item.put("progress", total > 0 ? signed + "/" + total : "-");
            item.put("createdAt", doc.getCreatedAt());

            // 서명자별 상세 현황
            List<Map<String, Object>> signerDetails = new ArrayList<>();
            for (DocumentSignature sig : sigs) {
                if (sig.getLinkedSignatureIdx() != null) continue;
                String sName = userRepository.findById(sig.getSignerUserIdx())
                        .map(User::getEmpName).orElse("알 수 없음");
                String sSlot = codeRepository.findByCode(sig.getSignatureSlot())
                        .map(Code::getCodeName).orElse(sig.getSignatureSlot());
                Map<String, Object> sd = new HashMap<>();
                sd.put("signerName", sName);
                sd.put("slotLabel", sSlot);
                sd.put("signed", "C1402".equals(sig.getStatus()) || "C1403".equals(sig.getStatus()));
                sd.put("requestedAt", sig.getRequestedAt());
                sd.put("signedAt", sig.getSignedAt());
                signerDetails.add(sd);
            }
            item.put("signers", signerDetails);

            result.add(item);
        }
        return result;
    }
}
