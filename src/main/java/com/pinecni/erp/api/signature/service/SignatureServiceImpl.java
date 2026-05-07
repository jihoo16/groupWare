package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.audit.service.AuditLogService;
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
    private final AuditLogService auditLogService;
    private final com.pinecni.erp.api.notification.service.NotificationEnqueueService notificationEnqueueService;

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

                    // C1901 — 그 차례 서명자에게 알림
                    try {
                        enqueueSignatureRequestNotification(document, row, requesterUserIdx);
                    } catch (Exception e) {
                        log.warn("[서명요청 알림 enqueue 실패 — 무시하고 진행] dsIdx={}, error={}",
                                row.getIdx(), e.getMessage());
                    }
                }
            }
        }

        log.info("서명 요청 생성 완료: documentIdx={}, docType={}, createdRows={}",
                documentIdx, documentType, createdRows.size());

        // 감사 로그: 문서 생성 + 서명 요청 (requesterUserIdx 기준)
        // 모든 문서 유형이 이 메서드를 호출하므로 한 곳에서 일괄 기록.
        // HttpServletRequest 는 이 계층에 없음 — ClientIpResolver 가 null 을 처리 (IP = 0.0.0.0 placeholder)
        if (requesterUserIdx != null) {
            auditLogService.logDocument(requesterUserIdx,
                    CodeConstants.AuditAction.CREATE,
                    documentIdx,
                    "문서 생성 및 서명 요청 (docType=" + documentType
                            + ", signerRows=" + createdRows.size() + ")",
                    null);
            auditLogService.log(requesterUserIdx,
                    CodeConstants.AuditTargetType.SIGNATURE,
                    CodeConstants.AuditAction.REQUEST_SIGNATURE,
                    null, documentIdx,
                    "서명 요청 " + createdRows.size() + "건 생성", null);
        }
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

    /**
     * 사용자의 PENDING DS 행 중 "이전 order 모두 완료인데 requested_at 누락" 인 케이스를
     * 즉석에서 활성화. 받은 요청 / 카운트 조회 진입 시 호출되어 advanceToNextOrder 가
     * 어떤 이유로(이벤트 누락·과거 버그·동시성·수동 DB 보정 등) 빠뜨린 활성화를 보정.
     *
     * <p>비용: 사용자당 PENDING 행 수만큼 문서당 한 번씩 advance 호출 (내부적으로
     * 자가복구형 reconcile 이라 idempotent). 일반 사용자는 PENDING 이 한 자릿수라 영향 미미.</p>
     */
    private void selfHealActivationForUser(Long userIdx) {
        try {
            List<DocumentSignature> myPending = documentSignatureRepository
                    .findAllPendingBySignerUserIdxIgnoringRequested(userIdx);
            // 같은 문서가 여러 행이어도 advance 는 idempotent — 문서별 한 번이면 충분
            java.util.Set<Long> docIdxList = new java.util.HashSet<>();
            for (DocumentSignature ds : myPending) {
                if (ds.getRequestedAt() == null) docIdxList.add(ds.getDocumentIdx());
            }
            for (Long docIdx : docIdxList) {
                advanceToNextOrder(docIdx, 0);
            }
            if (!docIdxList.isEmpty()) {
                log.info("[자가복구] 사용자 {} 의 미활성 단계 보정 시도: documentIdxList={}",
                        userIdx, docIdxList);
            }
        } catch (Exception e) {
            // 자가복구 실패해도 기본 조회는 진행 — 화면이 빈 채로라도 응답
            log.warn("[자가복구] 보정 중 오류 (조회는 계속): userIdx={}, error={}",
                    userIdx, e.getMessage());
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
        // 자가복구형(reconcile) 전략 — 전체 order 를 한 번에 재평가해 활성화가
        // 누락된 단계를 복구한다. 단순 currentOrder+1 만 건드리면:
        //   - 과거 버그/경합으로 activate 가 누락된 상위 order 는 영구 정체
        //   - 업데이트로 DS 행이 추가/변동됐을 때 누락분 미처리
        // 매 서명마다 호출되므로 전체 재평가의 비용은 무시할 수 있다.

        List<DocumentSignature> allRows = documentSignatureRepository
                .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx);

        // linked 제외 + order 별 그룹화 (TreeMap 으로 오름차순 자동 정렬)
        java.util.TreeMap<Integer, List<DocumentSignature>> byOrder = new java.util.TreeMap<>();
        for (DocumentSignature ds : allRows) {
            if (ds.getLinkedSignatureIdx() != null) continue;
            byOrder.computeIfAbsent(ds.getSignatureOrder(), k -> new ArrayList<>()).add(ds);
        }

        if (byOrder.isEmpty()) {
            log.info("advanceToNextOrder: 활성 DS 행 없음 (linked 제외), documentIdx={}", documentIdx);
            return;
        }

        log.info("advanceToNextOrder 재평가: documentIdx={}, 시작 order={}, order그룹={}",
                documentIdx, currentOrder, byOrder.keySet());

        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx).orElse(null);
        Long requesterIdx = document != null
                ? (document.getCreatedUserIdx() != null
                    ? document.getCreatedUserIdx() : document.getDrafterUserIdx())
                : null;

        LocalDateTime now = LocalDateTime.now();
        boolean prevAllComplete = true;   // 첫 order 는 무조건 활성 자격
        boolean anyCompleted = false;
        boolean allRowsComplete = true;

        for (Map.Entry<Integer, List<DocumentSignature>> entry : byOrder.entrySet()) {
            Integer order = entry.getKey();
            List<DocumentSignature> rows = entry.getValue();

            boolean orderComplete = true;
            for (DocumentSignature row : rows) {
                boolean done = CodeConstants.DocumentSignatureStatus.COMPLETED.getCode().equals(row.getStatus())
                        || CodeConstants.DocumentSignatureStatus.SKIPPED.getCode().equals(row.getStatus());
                if (done) {
                    anyCompleted = true;
                } else {
                    orderComplete = false;
                    allRowsComplete = false;
                }
            }

            // 이전 order 전원 완료 상태면 이 order 를 활성화 (requested_at 누락분 보정)
            if (prevAllComplete) {
                for (DocumentSignature row : rows) {
                    if (row.getRequestedAt() == null) {
                        row.setRequestedAt(now);
                        documentSignatureRepository.save(row);
                        log.info("단계 활성화: documentIdx={}, order={}, dsIdx={}, signerUserIdx={}, external={}",
                                documentIdx, order, row.getIdx(), row.getSignerUserIdx(),
                                Boolean.TRUE.equals(row.getIsExternal()));

                        // 외부인은 로그인 대상 아니라 알림 스킵 (external_person.idx ↔ users.idx 충돌 방지)
                        if (Boolean.TRUE.equals(row.getIsExternal())) continue;

                        // signature_requests 중복 방지 — 같은 document_signature_idx 로 이미 있으면 건너뜀
                        if (signatureRequestRepository
                                .existsByDocumentSignatureIdx(row.getIdx())) {
                            log.debug("signature_request 이미 존재: dsIdx={}", row.getIdx());
                            continue;
                        }

                        SignatureRequest sr = SignatureRequest.builder()
                                .documentIdx(documentIdx)
                                .documentSignatureIdx(row.getIdx())
                                .requesterUserIdx(requesterIdx != null ? requesterIdx : row.getSignerUserIdx())
                                .signerUserIdx(row.getSignerUserIdx())
                                .isCompleted(false)
                                .build();
                        signatureRequestRepository.save(sr);

                        // C1901 — 그 차례 서명자에게 알림 (advanceToNextOrder 경로)
                        try {
                            enqueueSignatureRequestNotification(document, row, requesterIdx);
                        } catch (Exception e) {
                            log.warn("[서명요청 알림 enqueue 실패 — 무시하고 진행] dsIdx={}, error={}",
                                    row.getIdx(), e.getMessage());
                        }
                    }
                }

                // C1902 — order > 1 의 활성화 = 이전 order 가 방금 완료된 시점.
                // 작성자(drafter) 에게 진행 상황 알림. 마지막 order 라면 SKIP (그건 C1903 으로 처리).
                if (order > 1 && document != null) {
                    int totalOrders = byOrder.size();
                    int completedOrdersNow = order - 1;
                    if (completedOrdersNow < totalOrders) {
                        try {
                            enqueueSignatureProgressNotification(document, rows, completedOrdersNow, totalOrders);
                        } catch (Exception e) {
                            log.warn("[서명진행 알림 enqueue 실패 — 무시하고 진행] documentIdx={}, order={}, error={}",
                                    documentIdx, order, e.getMessage());
                        }
                    }
                }
            }

            prevAllComplete = prevAllComplete && orderComplete;
        }

        // 문서 상태 반영
        if (allRowsComplete) {
            updateDocumentStatus(documentIdx, CodeConstants.DocumentStatus.SIGN_COMPLETE.getCode());
            log.info("전자서명 전체 완료: documentIdx={}", documentIdx);
        } else if (anyCompleted) {
            updateDocumentStatus(documentIdx, CodeConstants.DocumentStatus.SIGN_IN_PROGRESS.getCode());
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
    public Optional<LocalDateTime> getLastSignedAt(Long documentIdx) {
        return documentSignatureRepository.findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx)
                .stream()
                .map(DocumentSignature::getSignedAt)
                .filter(java.util.Objects::nonNull)
                .max(LocalDateTime::compareTo);
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
    @Transactional
    public long countPendingForUser(Long userIdx) {
        selfHealActivationForUser(userIdx);
        // 삭제된 문서 제외 — list와 동일한 기준
        return documentSignatureRepository.findPendingBySignerUserIdx(userIdx).stream()
                .filter(ds -> {
                    ApprovalDocument doc = approvalDocumentRepository.findById(ds.getDocumentIdx()).orElse(null);
                    return doc != null && doc.getDeletedAt() == null;
                })
                .count();
    }

    @Override
    @Transactional
    public List<Map<String, Object>> getPendingListForUser(Long userIdx) {
        selfHealActivationForUser(userIdx);
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
                String sName = resolveSignerName(sig);
                String sSlot = codeRepository.findByCode(sig.getSignatureSlot())
                        .map(Code::getCodeName).orElse(sig.getSignatureSlot());
                Map<String, Object> sd = new HashMap<>();
                sd.put("signerName", sName);
                sd.put("slotLabel", sSlot);
                sd.put("isExternal", Boolean.TRUE.equals(sig.getIsExternal()));
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

    /**
     * 내부/외부 서명자 이름 해석.
     * 외부행(is_external=true)은 signer_user_idx 가 external_person.idx 라
     * users 조회 시 "알 수 없음" 폴백으로 떨어지는 버그를 막기 위한 헬퍼.
     */
    private String resolveSignerName(DocumentSignature sig) {
        if (Boolean.TRUE.equals(sig.getIsExternal())) {
            return externalPersonRepository.findById(sig.getSignerUserIdx())
                    .map(ExternalPerson::getName).orElse("외부 인원");
        }
        return userRepository.findById(sig.getSignerUserIdx())
                .map(User::getEmpName).orElse("알 수 없음");
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

            // 본인(내부) 서명칸만 처리 — 외부인 행은 idx 충돌해도 절대 적용 금지
            if (!ds.getSignerUserIdx().equals(userIdx)) continue;
            if (Boolean.TRUE.equals(ds.getIsExternal())) continue;
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
                String sName = resolveSignerName(sig);
                String sSlot = codeRepository.findByCode(sig.getSignatureSlot())
                        .map(Code::getCodeName).orElse(sig.getSignatureSlot());
                Map<String, Object> sd = new HashMap<>();
                sd.put("signerName", sName);
                sd.put("slotLabel", sSlot);
                sd.put("isExternal", Boolean.TRUE.equals(sig.getIsExternal()));
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

    // =========================================================================
    // 알림 enqueue 헬퍼 (Phase 5 — C1901 서명요청 / C1902 서명진행)
    // =========================================================================

    private static final java.time.format.DateTimeFormatter NOTIF_TIME_FMT =
            java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** C1901 — 그 차례 서명자에게 알림. 외부인만 SKIP. */
    private void enqueueSignatureRequestNotification(ApprovalDocument document,
                                                     DocumentSignature ds,
                                                     Long requesterUserIdx) {
        if (document == null || ds == null) return;
        if (Boolean.TRUE.equals(ds.getIsExternal())) return;
        Long signerIdx = ds.getSignerUserIdx();
        if (signerIdx == null) return;

        String recipientName = userRepository.findById(signerIdx)
                .map(User::getEmpName).orElse("");
        String actorName = requesterUserIdx != null
                ? userRepository.findById(requesterUserIdx).map(User::getEmpName).orElse("")
                : "";
        String slotLabel = ds.getSignatureSlot() != null
                ? codeRepository.findByCode(ds.getSignatureSlot()).map(Code::getCodeName).orElse("서명")
                : "서명";

        String deepLink = approvalDeepLink(document.getDocumentType(), document.getIdx());

        java.util.Map<String, Object> vars = new java.util.LinkedHashMap<>();
        vars.put("recipientName",   recipientName);
        vars.put("documentTitle",   safe(document.getTitle(), "문서"));
        vars.put("documentNo",      safe(document.getDocumentNo(), ""));
        vars.put("slotLabel",       slotLabel);
        vars.put("actorName",       actorName);
        vars.put("eventTime",       LocalDateTime.now().format(NOTIF_TIME_FMT));
        vars.put("documentTypePath", "");        // link_template 변수 — deepLink 가 우선됨
        vars.put("documentIdx",     document.getIdx());
        vars.put("deepLink",        deepLink);

        notificationEnqueueService.enqueue(
                com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                        .notificationType("C1901")
                        .channel("C2101")
                        .channel("C2103")
                        .recipientUserIdx(signerIdx)
                        .actorUserIdx(requesterUserIdx)
                        .targetType("C1702")  // signature_requests
                        .targetIdx(ds.getIdx())
                        .documentIdx(document.getIdx())
                        .variables(vars)
                        .dedupKey("SIGREQ:" + ds.getIdx())
                        .build());
    }

    /**
     * C1902 — 중간 단계 완료 시 작성자(drafter) 에게 진행 상황 알림.
     * 다음 차례 서명자(들)는 이미 활성화된 상태 — rows 가 그 단계의 행들.
     */
    private void enqueueSignatureProgressNotification(ApprovalDocument document,
                                                      List<DocumentSignature> nextRows,
                                                      int completedOrders,
                                                      int totalOrders) {
        if (document == null || document.getDrafterUserIdx() == null) return;

        Long drafterIdx = document.getDrafterUserIdx();
        String recipientName = userRepository.findById(drafterIdx)
                .map(User::getEmpName).orElse("");

        // 다음 차례 (방금 활성화된) 서명자/슬롯 — 첫 행 기준
        DocumentSignature next = nextRows != null && !nextRows.isEmpty() ? nextRows.get(0) : null;
        String nextSignerName = "";
        String nextSlotLabel  = "";
        if (next != null) {
            if (next.getSignerUserIdx() != null) {
                nextSignerName = userRepository.findById(next.getSignerUserIdx())
                        .map(User::getEmpName).orElse("");
            }
            if (next.getSignatureSlot() != null) {
                nextSlotLabel = codeRepository.findByCode(next.getSignatureSlot())
                        .map(Code::getCodeName).orElse("");
            }
        }

        // 마지막으로 서명한 사람의 이름/슬롯은 "이전 단계 완료자" — 정확한 추적이 까다로워 비워둠
        // (필수 변수 아니라 템플릿에서 빈값으로 자연스럽게 렌더됨)
        String deepLink = approvalDeepLink(document.getDocumentType(), document.getIdx());

        java.util.Map<String, Object> vars = new java.util.LinkedHashMap<>();
        vars.put("recipientName",    recipientName);
        vars.put("documentTitle",    safe(document.getTitle(), "문서"));
        vars.put("documentNo",       safe(document.getDocumentNo(), ""));
        vars.put("actorName",        "");
        vars.put("actorSlotLabel",   "");
        vars.put("completedOrders",  completedOrders);
        vars.put("totalOrders",      totalOrders);
        vars.put("nextSignerName",   nextSignerName);
        vars.put("nextSlotLabel",    nextSlotLabel);
        vars.put("eventTime",        LocalDateTime.now().format(NOTIF_TIME_FMT));
        vars.put("documentTypePath", "");
        vars.put("documentIdx",      document.getIdx());
        vars.put("deepLink",         deepLink);

        notificationEnqueueService.enqueue(
                com.pinecni.erp.api.notification.dto.NotificationCreateCommand.builder()
                        .notificationType("C1902")
                        .channel("C2101")
                        .channel("C2103")
                        .recipientUserIdx(drafterIdx)
                        .actorUserIdx(drafterIdx)  // self — 도메인 actor 가 모호하면 drafter 로
                        .targetType("C1701")
                        .targetIdx(document.getIdx())
                        .documentIdx(document.getIdx())
                        .variables(vars)
                        .dedupKey("SIGPROGRESS:" + document.getIdx() + ":" + completedOrders)
                        .build());
    }

    /** documentType (C04) → /approval/{path}/detail?documentIdx={idx} 형태의 URL */
    public static String approvalDeepLink(String documentType, Long documentIdx) {
        String prefix = approvalPathPrefix(documentType);
        if (documentIdx == null) return prefix;
        if (prefix.endsWith("=")) return prefix + documentIdx;
        return prefix + "/" + documentIdx;
    }

    private static String approvalPathPrefix(String documentType) {
        if (documentType == null) return "/approval";
        return switch (documentType) {
            case "C0413" -> "/approval/vacation/detail?documentIdx=";
            case "C0401" -> "/approval/expense/detail?documentIdx=";
            case "C0402" -> "/approval/requisition/detail?documentIdx=";
            case "C0403" -> "/approval/receipt-overtime/detail?documentIdx=";
            case "C0404" -> "/approval/receipt-trip/detail?documentIdx=";
            case "C0405" -> "/approval/receipt-trip-meeting/detail?documentIdx=";
            case "C0406" -> "/approval/receipt-meeting/detail?documentIdx=";
            case "C0407", "C0408" -> "/approval/receipt-purchase/detail?documentIdx=";
            case "C0409" -> "/approval/weekly-report/detail?documentIdx=";
            case "C0410" -> "/approval/project-weekly-report/detail?documentIdx=";
            case "C0411" -> "/approval/monthly-report/detail?documentIdx=";
            case "C0412" -> "/approval/meeting/detail?documentIdx=";
            default      -> "/approval";
        };
    }

    private static String safe(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s;
    }
}
